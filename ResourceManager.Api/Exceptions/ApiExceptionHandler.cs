using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Npgsql;

namespace ResourceManager.Api.Exceptions;

/// <summary>Maps domain exceptions thrown by the services to ProblemDetails responses.</summary>
public class ApiExceptionHandler : IExceptionHandler
{
    // https://www.postgresql.org/docs/current/errcodes-appendix.html
    private const string ExclusionViolation = "23P01";
    private const string UniqueViolation = "23505";

    private const string NoOverlapConstraint = "EX_Reservations_NoOverlap";

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, title, detail) = Map(exception);

        if (statusCode == 0)
            return false; // not ours — let the default handler produce a 500

        httpContext.Response.StatusCode = statusCode;
        await httpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = statusCode,
            Title = title,
            Detail = detail
        }, cancellationToken);

        return true;
    }

    private static (int StatusCode, string Title, string? Detail) Map(Exception exception) => exception switch
    {
        NotFoundException => (StatusCodes.Status404NotFound, "Not Found", exception.Message),
        ConflictException => (StatusCodes.Status409Conflict, "Conflict", exception.Message),
        BadRequestException => (StatusCodes.Status400BadRequest, "Bad Request", exception.Message),

        // The services check their invariants before saving, but a concurrent request can
        // slip between that check and SaveChanges. The database constraint is the real
        // guard; when it fires, report the same 409 the pre-check would have produced
        // rather than leaking the driver's message as a 500.
        DbUpdateException { InnerException: PostgresException postgres } => MapPostgres(postgres),

        _ => (0, string.Empty, null)
    };

    private static (int StatusCode, string Title, string? Detail) MapPostgres(PostgresException exception) => exception switch
    {
        { SqlState: ExclusionViolation, ConstraintName: NoOverlapConstraint }
            => (StatusCodes.Status409Conflict, "Conflict",
                "The facility is already reserved during the requested time range."),

        { SqlState: ExclusionViolation or UniqueViolation }
            => (StatusCodes.Status409Conflict, "Conflict",
                "The request conflicts with an existing record."),

        _ => (0, string.Empty, null)
    };
}
