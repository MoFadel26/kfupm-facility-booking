using System.ComponentModel.DataAnnotations;

namespace ResourceManager.Api.DTO;

/// <summary>Page of results, plus what a client needs to ask for the next one.</summary>
public class PagedResult<T>
{
    public IReadOnlyList<T> Items { get; init; } = [];

    public int Page { get; init; }

    public int PageSize { get; init; }

    /// <summary>Rows matching the filter, not rows on this page.</summary>
    public int TotalCount { get; init; }

    public int TotalPages => PageSize <= 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
}

/// <summary>
/// Paging is not optional. An unbounded list endpoint is fine until the table is not, and
/// by then the client that depends on getting everything is already written, so the
/// default is a page rather than the whole table.
/// </summary>
public class PageQuery
{
    public const int MaxPageSize = 100;
    public const int DefaultPageSize = 25;

    [Range(1, int.MaxValue)]
    public int Page { get; set; } = 1;

    [Range(1, MaxPageSize)]
    public int PageSize { get; set; } = DefaultPageSize;
}

public class ReservationQuery : PageQuery
{
    /// <summary>KFUPM id of the booking user.</summary>
    public string? UserId { get; set; }

    public string? FacilityId { get; set; }
}

public class EventParticipantQuery : PageQuery
{
    public string? UserId { get; set; }

    public string? ReservationId { get; set; }
}
