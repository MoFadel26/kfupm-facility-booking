using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ResourceManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class ConvertForeignKeysToNaturalStringKeys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EventParticipants_Reservations_ReservationId",
                table: "EventParticipants");

            migrationBuilder.DropForeignKey(
                name: "FK_EventParticipants_Users_UserId",
                table: "EventParticipants");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_Facilities_FacilityId",
                table: "Reservations");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_Users_UserId",
                table: "Reservations");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "Reservations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "FacilityId",
                table: "Reservations",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "UserId",
                table: "EventParticipants",
                type: "character varying(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AlterColumn<string>(
                name: "ReservationId",
                table: "EventParticipants",
                type: "character varying(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Users_KfupmId",
                table: "Users",
                column: "KfupmId");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Reservations_ReservationId",
                table: "Reservations",
                column: "ReservationId");

            migrationBuilder.AddUniqueConstraint(
                name: "AK_Facilities_FacilityId",
                table: "Facilities",
                column: "FacilityId");

            migrationBuilder.AddForeignKey(
                name: "FK_EventParticipants_Reservations_ReservationId",
                table: "EventParticipants",
                column: "ReservationId",
                principalTable: "Reservations",
                principalColumn: "ReservationId",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EventParticipants_Users_UserId",
                table: "EventParticipants",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "KfupmId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_Facilities_FacilityId",
                table: "Reservations",
                column: "FacilityId",
                principalTable: "Facilities",
                principalColumn: "FacilityId",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_Users_UserId",
                table: "Reservations",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "KfupmId",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_EventParticipants_Reservations_ReservationId",
                table: "EventParticipants");

            migrationBuilder.DropForeignKey(
                name: "FK_EventParticipants_Users_UserId",
                table: "EventParticipants");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_Facilities_FacilityId",
                table: "Reservations");

            migrationBuilder.DropForeignKey(
                name: "FK_Reservations_Users_UserId",
                table: "Reservations");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Users_KfupmId",
                table: "Users");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Reservations_ReservationId",
                table: "Reservations");

            migrationBuilder.DropUniqueConstraint(
                name: "AK_Facilities_FacilityId",
                table: "Facilities");

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "Reservations",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<Guid>(
                name: "FacilityId",
                table: "Reservations",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<Guid>(
                name: "UserId",
                table: "EventParticipants",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<Guid>(
                name: "ReservationId",
                table: "EventParticipants",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(30)",
                oldMaxLength: 30);

            migrationBuilder.AddForeignKey(
                name: "FK_EventParticipants_Reservations_ReservationId",
                table: "EventParticipants",
                column: "ReservationId",
                principalTable: "Reservations",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_EventParticipants_Users_UserId",
                table: "EventParticipants",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_Facilities_FacilityId",
                table: "Reservations",
                column: "FacilityId",
                principalTable: "Facilities",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Reservations_Users_UserId",
                table: "Reservations",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
