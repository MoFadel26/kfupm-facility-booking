package com.example.swe206_project;

import java.util.List;

public class Admin {
    private String adminName;
    private int adminId;
    public Admin(String adminName, int adminId){
        this.adminId = adminId;
        this.adminName = adminName;
    }

    //getters
    public int getAdminId() {
        return adminId;
    }

    public String getAdminName() {
        return adminName;
    }

    //setters
    public void setAdminId(int adminId) {
        this.adminId = adminId;
    }

    public void setAdminName(String adminName) {
        this.adminName = adminName;
    }

    public void cancelReservation(int reservationId){

    }
    /*
    public List<Reservation> viewAllReservation(){
        return ;
    }
     */
    public void getReservation(int reservationId){

    }
    public void approveReservation(){

    }
}
