using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResourceManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReservationOverlapExclusionConstraint : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reservations_FacilityId_StartTime_EndTime",
                table: "Reservations");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_FacilityId",
                table: "Reservations",
                column: "FacilityId");

            // The dropped unique index only caught reservations with byte-identical
            // start and end times; the rule the domain actually has is that two
            // non-cancelled reservations for the same facility may not overlap at all.
            // Only the database can enforce that without a race between the service's
            // overlap check and SaveChanges, so it becomes an exclusion constraint.
            // btree_gist supplies the "=" GiST operator class the FacilityId column needs.
            migrationBuilder.Sql("""CREATE EXTENSION IF NOT EXISTS btree_gist;""");

            // '[)' bounds make the range half-open, so a reservation ending exactly when
            // the next begins is not an overlap. This matches ReservationService's
            // strict "StartTime < endTime && EndTime > startTime" comparison.
            migrationBuilder.Sql("""
                ALTER TABLE "Reservations"
                    ADD CONSTRAINT "EX_Reservations_NoOverlap"
                    EXCLUDE USING gist (
                        "FacilityId" WITH =,
                        tstzrange("StartTime", "EndTime", '[)') WITH &&
                    )
                    WHERE ("Status" <> 'Cancelled');
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                ALTER TABLE "Reservations" DROP CONSTRAINT "EX_Reservations_NoOverlap";
                """);

            migrationBuilder.DropIndex(
                name: "IX_Reservations_FacilityId",
                table: "Reservations");

            migrationBuilder.CreateIndex(
                name: "IX_Reservations_FacilityId_StartTime_EndTime",
                table: "Reservations",
                columns: new[] { "FacilityId", "StartTime", "EndTime" },
                unique: true);
        }
    }
}
