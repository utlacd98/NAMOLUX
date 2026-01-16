import { prisma } from "./db"

export const CREDIT_COSTS = {
  DOMAIN_GENERATION: 1,
  SEO_AUDIT: 1,
} as const

export async function getUserByClerkId(clerkId: string) {
  return await prisma.user.findUnique({
    where: { clerkId },
  })
}

export async function createUser(clerkId: string, email: string) {
  return await prisma.user.create({
    data: {
      clerkId,
      email,
      credits: 3, // Free credits for new users
    },
  })
}

export async function getOrCreateUser(clerkId: string, email: string) {
  let user = await getUserByClerkId(clerkId)
  if (!user) {
    user = await createUser(clerkId, email)
  }
  return user
}

export async function getUserCredits(clerkId: string) {
  const user = await getUserByClerkId(clerkId)
  return user?.credits ?? 0
}

export async function hasEnoughCredits(clerkId: string, requiredCredits: number) {
  const credits = await getUserCredits(clerkId)
  return credits >= requiredCredits
}

export async function deductCredits(
  clerkId: string,
  credits: number,
  action: string,
  metadata?: Record<string, any>,
) {
  const user = await getUserByClerkId(clerkId)
  if (!user) {
    throw new Error("User not found")
  }

  if (user.credits < credits) {
    throw new Error("Insufficient credits")
  }

  // Use a transaction to ensure atomicity
  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { clerkId },
      data: {
        credits: {
          decrement: credits,
        },
      },
    }),
    prisma.usage.create({
      data: {
        userId: user.id,
        action,
        credits,
        metadata: metadata || {},
      },
    }),
  ])

  return updatedUser
}

export async function addCredits(
  clerkId: string,
  credits: number,
  type: "purchase" | "bonus" | "refund",
  amount?: number,
  stripeSessionId?: string,
) {
  const user = await getUserByClerkId(clerkId)
  if (!user) {
    throw new Error("User not found")
  }

  const [updatedUser] = await prisma.$transaction([
    prisma.user.update({
      where: { clerkId },
      data: {
        credits: {
          increment: credits,
        },
      },
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        type,
        credits,
        amount,
        stripeSessionId,
        status: "completed",
      },
    }),
  ])

  return updatedUser
}

export async function getUserUsageHistory(clerkId: string, limit = 50) {
  const user = await getUserByClerkId(clerkId)
  if (!user) {
    return []
  }

  return await prisma.usage.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

export async function getUserTransactionHistory(clerkId: string, limit = 50) {
  const user = await getUserByClerkId(clerkId)
  if (!user) {
    return []
  }

  return await prisma.transaction.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  })
}

