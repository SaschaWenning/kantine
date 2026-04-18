import { type NextRequest, NextResponse } from "next/server"
import { readFile, writeFile, unlink } from "fs/promises"
import { existsSync } from "fs"
import { join } from "path"

const DATA_DIR = join(process.cwd(), "data")
const USERS_FILE = join(DATA_DIR, "users.json")

function getKantineFilePath(userId: string): string {
  const safeId = userId.replace(/[^a-zA-Z0-9]/g, "_")
  return join(DATA_DIR, `kantine-${safeId}.json`)
}

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 })
    }

    // Users aktualisieren
    const usersData = await readFile(USERS_FILE, "utf-8")
    const { users } = JSON.parse(usersData)
    const updatedUsers = users.filter((u: any) => u.id !== userId)
    await writeFile(USERS_FILE, JSON.stringify({ users: updatedUsers }, null, 2))

    // Kantine-Datei löschen
    const kantineFile = getKantineFilePath(userId)
    if (existsSync(kantineFile)) {
      await unlink(kantineFile)
    }

    return NextResponse.json({ success: true, message: "Kantine deleted" })
  } catch (error) {
    console.error("Error deleting kantine:", error)
    return NextResponse.json(
      { error: "Failed to delete kantine", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
