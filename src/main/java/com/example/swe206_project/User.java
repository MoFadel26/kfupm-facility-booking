package com.example.swe206_project;

import java.util.List;
import java.util.Random;

public abstract class User {
    private int userId;
    private String username;
    private String Email;
    private String gender;
    private List<Reservation> reservations;
    public User(int userId, String username){
        this.userId = userId;
        this.username = username;
        this.Email = null;
        this.gender = null;
        this.reservations = null;
    }
    public User(String username){
        this.username = username;
        this.Email = null;
        this.gender = null;
        this.userId = random();
        this.reservations = null;
    }
    public int random(){
        Random random = new Random();
        return random.nextInt(100);
    }

    // getter for the private variable

    public List<Reservation> getReservations() {
        return reservations;
    }
    public String getEmail() {
        return Email;
    }
    public int getUserId() {
        return userId;
    }
    public String getGender() {
        return gender;
    }
    public String getUsername() {
        return username;
    }

    // setter for the private variable

    public void setReservations(List<Reservation> reservations) {
        this.reservations = reservations;
    }
    public void setEmail(String email) {
        Email = email;
    }
    public void setGender(String gender) {
        this.gender = gender;
    }
    public void setUsername(String username) {
        this.username = username;
    }

    public void makeReservation(String facility, String reason){

    }
    public void cancelReservation(int reservationId){

    }
    public void manageEvent(int reservationId){

    }
}
