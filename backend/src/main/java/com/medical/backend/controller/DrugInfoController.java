package com.medical.backend.controller;

import com.medical.backend.dto.DrugInfoDTO;
import com.medical.backend.dto.DrugProfileDTO;
import com.medical.backend.service.DrugDetailService;
import com.medical.backend.service.ExternalDrugService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/drug-info")
@CrossOrigin(origins = "http://localhost:4200", allowCredentials = "true")
public class DrugInfoController {

    @Autowired
    private DrugDetailService drugDetailService;

    @Autowired
    private ExternalDrugService externalDrugService;

    @GetMapping("/{drugName}")
    public ResponseEntity<DrugInfoDTO> getDrugDetails(@PathVariable("drugName") String drugName) {
        DrugInfoDTO info = drugDetailService.getDrugDetails(drugName);
        return ResponseEntity.ok(info);
    }

    @GetMapping("/profile")
    public ResponseEntity<DrugProfileDTO> getDrugProfile(@RequestParam("name") String name) {
        DrugProfileDTO profile = externalDrugService.fetchDrugProfile(name);
        return ResponseEntity.ok(profile);
    }
}
