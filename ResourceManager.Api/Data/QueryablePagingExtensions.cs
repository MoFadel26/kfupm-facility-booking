using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Data;

public static class QueryablePagingExtensions
{
    /// <summary>
    /// Counts the matching rows and returns one page of them.
    ///
    /// Offset paging, which is the right trade at this size: a facility booking system has
    /// thousands of reservations, not millions, and clients want to jump to a page rather
    /// than walk a cursor. It does mean the query must be ordered by something unique, or
    /// the database is free to return rows in a different order between pages and a row
    /// can appear twice or not at all. Every caller here orders by a non-unique column and
    /// then by Id.
    /// </summary>
    public static async Task<PagedResult<T>> ToPagedResultAsync<T>(
        this IQueryable<T> query,
        PageQuery page,
        CancellationToken ct = default)
    {
        var totalCount = await query.CountAsync(ct);

        var items = await query
            .Skip((page.Page - 1) * page.PageSize)
            .Take(page.PageSize)
            .ToListAsync(ct);

        return new PagedResult<T>
        {
            Items = items,
            Page = page.Page,
            PageSize = page.PageSize,
            TotalCount = totalCount
        };
    }
}
