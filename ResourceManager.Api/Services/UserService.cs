using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.Data;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Exceptions;
using ResourceManager.Api.Models;

namespace ResourceManager.Api.Services;

public class UserService : IUserService
{
    private readonly AppDbContext _db;

    public UserService(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<UserResponse>> GetAllAsync(CancellationToken ct = default)
    {
        return await _db.Users.AsNoTracking()
            .OrderBy(u => u.Name)
            .Select(UserMappingExtensions.Projection)
            .ToListAsync(ct);
    }

    public async Task<UserResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        return await _db.Users.AsNoTracking()
            .Where(u => u.Id == id)
            .Select(UserMappingExtensions.Projection)
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException(nameof(User), id);
    }

    public async Task<UserResponse> CreateAsync(UserRequest request, CancellationToken ct = default)
    {
        await EnsureUniqueAsync(request.KfupmId, request.Email, excludeId: null, ct);

        var user = new User(request.KfupmId.Trim(), request.Name.Trim(), request.Email.Trim(), request.Role, request.Gender);
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return user.ToResponse();
    }

    public async Task<UserResponse> UpdateAsync(Guid id, UserRequest request, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
                   ?? throw new NotFoundException(nameof(User), id);

        // The KFUPM id is this user's identity everywhere else in the schema. Reservations
        // and participations reference it directly, so a change here is not a rename — it
        // strands those rows against a value that no longer exists, and the database
        // rejects it as a foreign key violation.
        if (request.KfupmId.Trim() != user.KfupmId)
            throw new ConflictException(
                $"A user's KFUPM id cannot be changed (it is '{user.KfupmId}'). Create a new user instead.");

        await EnsureUniqueAsync(request.KfupmId, request.Email, excludeId: id, ct);

        user.Update(request.Name.Trim(), request.Email.Trim(), request.Role, request.Gender);
        await _db.SaveChangesAsync(ct);
        return user.ToResponse();
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
                   ?? throw new NotFoundException(nameof(User), id);

        if (await _db.Reservations.AnyAsync(r => r.UserId == user.KfupmId, ct))
            throw new ConflictException("Cannot delete a user who has reservations. Delete their reservations first.");

        if (await _db.EventParticipants.AnyAsync(ep => ep.UserId == user.KfupmId, ct))
            throw new ConflictException("Cannot delete a user who participates in events. Remove their participations first.");

        _db.Users.Remove(user);
        await _db.SaveChangesAsync(ct);
    }

    private async Task EnsureUniqueAsync(string kfupmId, string email, Guid? excludeId, CancellationToken ct)
    {
        var trimmedKfupmId = kfupmId.Trim();
        var trimmedEmail = email.Trim();

        if (await _db.Users.AnyAsync(u => u.KfupmId == trimmedKfupmId && u.Id != excludeId, ct))
            throw new ConflictException($"A user with KFUPM id '{trimmedKfupmId}' already exists.");

        if (await _db.Users.AnyAsync(u => u.Email == trimmedEmail && u.Id != excludeId, ct))
            throw new ConflictException($"A user with email '{trimmedEmail}' already exists.");
    }
}
