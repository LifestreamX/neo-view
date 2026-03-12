import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/auth-options'
import { prisma } from '@/lib/db/prisma'

export async function DELETE(
  request: NextRequest,
  context: { params: { id: string } } | { params: Promise<{ id: string }> }
) {
  // Support both Promise and non-Promise params (Next.js 16+ Turbopack)
  const paramsObj =
    'then' in context.params ? await context.params : context.params
  const { id } = paramsObj
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    await prisma.savedAircraft.delete({
      where: {
        id,
        userId: session.user.id,
      },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete saved aircraft error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
