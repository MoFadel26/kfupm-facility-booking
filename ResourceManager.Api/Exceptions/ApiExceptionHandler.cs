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

    private readonly IProblemDetailsService _problemDetailsService;
    private readonly ILogger<ApiExceptionHandler> _logger;

    public ApiExceptionHandler(IProblemDetailsService problemDetailsService, ILogger<ApiExceptionHandler> logger)
    {
        _problemDetailsService = problemDetailsService;
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var (statusCode, title, detail, level) = Map(exception);

        if (statusCode == 0)
            return false; // not ours — the framework logs it and produces a 500

        // These are expected outcomes, not faults, so they are logged without a stack
        // trace. The message carries what a reader needs to find the request again.
        _logger.Log(level, "{Method} {Path} rejected with {StatusCode}: {Detail}",
            httpContext.Request.Method, httpContext.Request.Path.Value, statusCode, detail);

        httpContext.Response.StatusCode = statusCode;

        // Written through the ProblemDetailsService rather than serialised directly. That
        // is what puts a traceId on the response, matching the framework's own 400s, and
        // it is the only reason these carry one — verified by serialising directly, which
        // drops it.
        return await _problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            Exception = exception,
            ProblemDetails = new ProblemDetails
            {
                Status = statusCode,
                Title = title,
                Detail = detail
            }
        });
    }

    private static (int StatusCode, string Title, string? Detail, LogLevel Level) Map(Exception exception) => exception switch
    {
        NotFoundException => (StatusCodes.Status404NotFound, "Not Found", exception.Message, LogLevel.Information),
        ConflictException => (StatusCodes.Status409Conflict, "Conflict", exception.Message, LogLevel.Information),
        BadRequestException => (StatusCodes.Status400BadRequest, "Bad Request", exception.Message, LogLevel.Information),

        // The services check their invariants before saving, but a concurrent request can
        // slip between that check and SaveChanges. The database constraint is the real
        // guard; when it fires, report the same 409 the pre-check would have produced
        // rather than leaking the driver's message as a 500.
        DbUpdateException { InnerException: PostgresException postgres } => MapPostgres(postgres),

        _ => (0, string.Empty, null, LogLevel.None)
    };

    private static (int StatusCode, string Title, string? Detail, LogLevel Level) MapPostgres(PostgresException exception) => exception switch
    {
        // Warning, not Information: reaching this means two requests raced past the
        // service's pre-check, which is worth noticing even though the outcome is correct.
        { SqlState: ExclusionViolation, ConstraintName: NoOverlapConstraint }
            => (StatusCodes.Status409Conflict, "Conflict",
                "The facility is already reserved during the requested time range.", LogLevel.Warning),

        { SqlState: ExclusionViolation or UniqueViolation }
            => (StatusCodes.Status409Conflict, "Conflict",
                "The request conflicts with an existing record.", LogLevel.Warning),

        _ => (0, string.Empty, null, LogLevel.None)
    };
}
