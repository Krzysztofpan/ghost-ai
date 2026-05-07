interface ErrorResponseBody {
  error: string
}

function errorResponse(status: number, message: string) {
  const body: ErrorResponseBody = { error: message }
  return Response.json(body, { status })
}

export function badRequestResponse(message = "Bad Request") {
  return errorResponse(400, message)
}

export function unauthorizedResponse(message = "Unauthorized") {
  return errorResponse(401, message)
}

export function forbiddenResponse(message = "Forbidden") {
  return errorResponse(403, message)
}

export function notFoundResponse(message = "Not Found") {
  return errorResponse(404, message)
}

export function conflictResponse(message = "Conflict") {
  return errorResponse(409, message)
}

export function unprocessableEntityResponse(message = "Unprocessable Entity") {
  return errorResponse(422, message)
}

export function internalServerErrorResponse(message = "Internal Server Error") {
  return errorResponse(500, message)
}
