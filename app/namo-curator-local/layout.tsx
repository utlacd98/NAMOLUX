import type { ReactNode } from "react"

export default function NamingCuratorLayout({ children }: { children: ReactNode }) {
  return <div data-local-curator="true">{children}</div>
}
