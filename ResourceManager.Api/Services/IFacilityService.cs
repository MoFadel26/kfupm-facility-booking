using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Services;

public interface IFacilityService
{
    Task<PagedResult<FacilityResponse>> GetAllAsync(PageQuery query, CancellationToken ct = default);
    Task<FacilityResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<FacilityResponse> CreateAsync(FacilityRequest request, CancellationToken ct = default);
    Task<FacilityResponse> UpdateAsync(Guid id, FacilityRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
