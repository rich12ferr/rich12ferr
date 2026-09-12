import { auth } from "../lib/auth"

async function main() {
  const ctx = await auth.$context
  const [user] = await ctx.internalAdapter.findUserByEmail
    ? [await ctx.internalAdapter.findUserByEmail(process.env.ADMIN_EMAIL!)]
    : []
  const userRecord = user?.user
  if (!userRecord) {
    console.error("admin user not found")
    process.exit(1)
  }
  const session = await ctx.internalAdapter.createSession(userRecord.id, false)
  console.log(JSON.stringify({ token: session.token }))
  process.exit(0)
}

main()
