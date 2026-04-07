package com.medical.backend.controller;

import com.medical.backend.config.JwtUtil;
import com.medical.backend.entity.Notification;
import com.medical.backend.entity.User;
import com.medical.backend.repository.UserRepository;
import com.medical.backend.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@CrossOrigin(origins = "http://localhost:4200")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping
    public ResponseEntity<List<Notification>> getMyNotifications(@RequestHeader("Authorization") String token) {
        String jwt = token.substring(7);
        String email = jwtUtil.extractUsername(jwt);
        User user = userRepository.findByEmail(email).orElseThrow(() -> new RuntimeException("User not found"));

        return ResponseEntity.ok(notificationService.getUserNotifications(user.getId()));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable("id") Long id) {
        return ResponseEntity.ok(notificationService.markAsRead(id));
    }

    @PostMapping("/send")
    public ResponseEntity<Notification> sendNotification(@RequestBody Map<String, Object> request) {
        Long userId = Long.valueOf(request.get("userId").toString());
        String message = (String) request.get("message");
        String type = (String) request.get("type");

        User user = userRepository.findById(userId).orElseThrow(() -> new RuntimeException("User not found"));
        return ResponseEntity.ok(notificationService.createNotification(user, message, type));
    }
}
