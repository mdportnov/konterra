import { auth } from '@/auth'
import { unauthorized, badRequest, notFound, success, serverError } from '@/lib/api-utils'
import { geocode } from '@/lib/geocoding'

export async function GET(req: Request) {
  const session = await auth()
  if (!session?.user?.id) return unauthorized()

  try {
    const { searchParams } = new URL(req.url)
    const query = searchParams.get('q')

    if (!query) return badRequest('Query required')

    const result = await geocode(query)

    if (!result) return notFound('Location')

    return success(result)
  } catch (err) {
    console.error(err)
    return serverError()
  }
}
