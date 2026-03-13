export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { asteroidId, asteroidName, notes } = await request.json()
  if (!asteroidId || !asteroidName) {
    return NextResponse.json(
      { error: 'Missing asteroidId or asteroidName' },
      { status: 400 }
    )
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  // Create favorite asteroid
  const favoriteAsteroid = await prisma.favoriteAsteroid.create({
    data: {
      userId: user.id,
      asteroidId,
      asteroidName,
      notes,
    },
  })

  return NextResponse.json({ favoriteAsteroid })
}
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/db/prisma'
import { authOptions } from '@/lib/auth/auth-options'

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { favoriteAsteroids: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }
  return NextResponse.json({ savedAsteroids: user.favoriteAsteroids })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await request.json()
  if (!id) {
    return NextResponse.json({ error: 'Missing asteroid id' }, { status: 400 })
  }

  await prisma.favoriteAsteroid.delete({
    where: { id },
  })
  return NextResponse.json({ success: true })
}
