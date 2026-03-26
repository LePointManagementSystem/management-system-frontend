const BASE_URL = import.meta.env.VITE_API_BASE_URL;

export type Owner = {
    ownerID: number
    firstName: string
    lastName: string
    email: string
    phonenumber?: string
}

export async function getOwners(): Promise<Owner[]> {

    const token = localStorage.getItem("token")

    const res = await fetch(`${BASE_URL}/Owner`,{
        headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
        },
    })

    const raw = await res.text()
    let json: any = null
    try { json = raw ? JSON.parse(raw) : null } catch {}

    if (!res.ok) {
        throw new Error(json?.message || raw || "Failed to fetch owners")
    }

    return (json?.data ?? json) as Owner[]

}