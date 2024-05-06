module com.example.swe206_project {
    requires javafx.controls;
    requires javafx.fxml;


    opens com.example.swe206_project to javafx.fxml;
    exports com.example.swe206_project;
}