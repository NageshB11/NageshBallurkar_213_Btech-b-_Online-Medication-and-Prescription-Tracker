package com.medical.backend.controller; // Make sure this matches your package name!

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HomeController {

    @GetMapping("/")
    public String welcome() {
        return "<h1>Welcome Ansaf!</h1><p>Your Medical Backend is officially running and connected to MySQL.</p>";
    }
}