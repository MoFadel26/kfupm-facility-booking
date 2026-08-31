using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.Data;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Exceptions;
using ResourceManager.Api.Models;

namespace ResourceManager.Api.Services;

public class FacilityService : IFacilityService
{
    private readonly AppDbContext _db;

    public FacilityService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<FacilityResponse>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.Facilities.AsNoTracking()
            .OrderBy(f => f.Name)
            .Select(FacilityMappingExtensions.Projection)
            .ToListAsync(ct);
    }

    public async Task<FacilityResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Facilities.AsNoTracking()
            .Where(f => f.Id == id)
            .Select(FacilityMappingExtensions.Projection)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(Facility), id);
    }

    public async Task<FacilityResponse> CreateAsync(FacilityRequest request, CancellationToken ct = default)
    {
        await EnsureUniqueAsync(request.FacilityId, excludeId: null, ct);

        var facility = new Facility(request.FacilityId.Trim(), request.Name.Trim(), request.Type, request.AllowedGender, request.AllowedRole);
        _db.Facilities.Add(facility);
        await _db.SaveChangesAsync(ct);
        return facility.ToResponse();
    }

    public async Task<FacilityResponse> UpdateAsync(Guid id, FacilityRequest request, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == id, ct)
                       ?? throw new NotFoundException(nameof(Facility), id);

        // Reservations reference the facility id directly; changing it strands them.
        if (request.FacilityId.Trim() != facility.FacilityId)
            throw new ConflictException(
                $"A facility's id cannot be changed (it is '{facility.FacilityId}'). Create a new facility instead.");

        await EnsureUniqueAsync(request.FacilityId, excludeId: id, ct);

        facility.Update(request.Name.Trim(), request.Type, request.AllowedGender, request.AllowedRole);
        await _db.SaveChangesAsync(ct);
        return facility.ToResponse();
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var facility = await _db.Facilities.FirstOrDefaultAsync(f => f.Id == id, ct)
                       ?? throw new NotFoundException(nameof(Facility), id);

        if (await _db.Reservations.AnyAsync(r => r.FacilityId == facility.FacilityId, ct))
            throw new ConflictException("Cannot delete a facility that has reservations. Delete its reservations first.");

        _db.Facilities.Remove(facility);
        await _db.SaveChangesAsync(ct);
    }

    private async Task EnsureUniqueAsync(string facilityId, Guid? excludeId, CancellationToken ct)
    {
        var trimmed = facilityId.Trim();
        if (await _db.Facilities.AnyAsync(f => f.FacilityId == trimmed && f.Id != excludeId, ct))
            throw new ConflictException($"A facility with id '{trimmed}' already exists.");
    }
}
