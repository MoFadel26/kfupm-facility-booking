using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Services;

public interface IReservationService
{
    Task<List<ReservationResponse>> GetAllAsync(CancellationToken ct = default);
    Task<ReservationResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<ReservationResponse>> GetByUserIdAsync(string userId, CancellationToken ct = default);
    Task<List<ReservationResponse>> GetByFacilityIdAsync(string facilityId, CancellationToken ct = default);
    Task<ReservationResponse> CreateAsync(CreateReservationRequest request, CancellationToken ct = default);
    Task<ReservationResponse> UpdateAsync(Guid id, UpdateReservationRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
