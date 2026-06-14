import { timingSafeEqual } from "crypto"
import { NextRequest, NextResponse } from "next/server"

const ADMIN_COOKIE_NAME = "admin_token"
const ONE_WEEK_SECONDS = 60 * 60 * 24 * 7

function tokensMatch(candidate: string, secret: string): boolean {
  const candidateBuffer = Buffer.from(candidate)
  const secretBuffer = Buffer.from(secret)

  return (
    candidateBuffer.length === secretBuffer.length &&
    timingSafeEqual(candidateBuffer, secretBuffer)
  )
}

function unauthorizedResponse() {
  return NextResponse.json(
    { error: "Invalid admin token" },
    {
      status: 401,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  )
}

export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_SECRET
  if (!secret) {
    return NextResponse.json(
      { error: "Admin access is not configured" },
      {
        status: 503,
        headers: {
          "Cache-Control": "no-store",
          "X-Robots-Tag": "noindex, nofollow",
        },
      }
    )
  }

  let token = ""
  try {
    const body = await request.json()
    token = typeof body?.token === "string" ? body.token : ""
  } catch {
    return unauthorizedResponse()
  }

  if (!token || !tokensMatch(token, secret)) {
    return unauthorizedResponse()
  }

  const response = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  )

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ONE_WEEK_SECONDS,
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  )

  response.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  })

  return response
}
