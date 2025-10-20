import React from "react"

export default function Root({ children }: { children?: React.ReactNode }) {
    // Minimal root for the router — render nested route content
    return <>{children}</>
}