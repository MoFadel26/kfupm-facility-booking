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
        var users = await _db.Users.AsNoTracking().OrderBy(u => u.Name).ToListAsync(ct);
        return users.Select(u => u.ToResponse()).ToList();
    }

    public async Task<UserResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct)
                   ?? throw new NotFoundException(nameof(User), id);
        return user.ToResponse();
    }

    public async Task<UserResponse> CreateAsync(UserRequest request, CancellationToken ct = default)
    {
        ValidateFields(request);
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

        ValidateFields(request);
        await EnsureUniqueAsync(request.KfupmId, request.Email, excludeId: id, ct);

        user.Update(request.KfupmId.Trim(), request.Name.Trim(), request.Email.Trim(), request.Role, request.Gender);
        await _db.SaveChangesAsync(ct);
        return user.ToResponse();
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == id, ct)
                   ?? throw new NotFoundException(nameof(User), id);

        if (await _db.Reservations.AnyAsync(r => r.UserId == id, ct))
            throw new ConflictException("Cannot delete a user who has reservations. Delete their reservations first.");

        if (await _db.EventParticipants.AnyAsync(ep => ep.UserId == id, ct))
            throw new ConflictException("Cannot delete a user who participates in events. Remove their participations first.");

        _db.Users.Remove(user);
        await _db.SaveChangesAsync(ct);
    }

    private static void ValidateFields(UserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.KfupmId))
            throw new BadRequestException("KfupmId is required.");
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new BadRequestException("Name is required.");
        if (string.IsNullOrWhiteSpace(request.Email) || !request.Email.Contains('@'))
            throw new BadRequestException("A valid email is required.");
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
