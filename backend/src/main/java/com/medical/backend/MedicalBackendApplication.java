package com.medical.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class MedicalBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(MedicalBackendApplication.class, args);
	}

}
