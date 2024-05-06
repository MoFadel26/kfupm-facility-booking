package com.example.swe206_project;

import java.time.LocalDateTime;
import java.util.Random;

public class Reservation {
    private int reservationId;
    private User organizer;
    private int requiredParticipants;
    private int registeredParticipants;
    private String reason;
    private String status;
    private int roomSize;
    private TimeSlot timeSlot;

    public Reservation(User organizer, int requiredParticipants, int registeredParticipants, String reason, String status, int roomSize, TimeSlot timeSlot) {
        this.organizer = organizer;
        this.requiredParticipants = requiredParticipants;
        this.registeredParticipants = registeredParticipants;
        this.reason = reason;
        this.status = status;
        this.roomSize = roomSize;
        this.timeSlot = timeSlot;
        this.reservationId = random();
    }
    private int random(){
        Random random = new Random();
        return random.nextInt(100);
    }

    //getters
    public int getReservationId() {
        return reservationId;
    }
    public User getOrganizer() {
        return organizer;
    }
    public int getRequiredParticipants() {
        return requiredParticipants;
    }
    public int getRegisteredParticipants() {
        return registeredParticipants;
    }
    public String getReason() {
        return reason;
    }
    public String getStatus() {
        return status;
    }
    public int getRoomSize() {
        return roomSize;
    }
    public TimeSlot getTimeSlot() {
        return timeSlot;
    }

    //setters
    public void setReservationId(int reservationId) {
        this.reservationId = reservationId;
    }
    public void setOrganizer(User organizer) {
        this.organizer = organizer;
    }
    public void setRequiredParticipants(int requiredParticipants) {
        this.requiredParticipants = requiredParticipants;
    }
    public void setRegisteredParticipants(int registeredParticipants) {
        this.registeredParticipants = registeredParticipants;
    }
    public void setReason(String reason) {
        this.reason = reason;
    }
    public void setStatus(String status) {
        this.status = status;
    }
    public void setRoomSize(int roomSize) {
        this.roomSize = roomSize;
    }
    public void setTimeSlot(TimeSlot timeSlot) {
        this.timeSlot = timeSlot;
    }

    /*
    public String getReservationDetails(){

    }
     */
    public void notifyCancellation(){

    }
}
