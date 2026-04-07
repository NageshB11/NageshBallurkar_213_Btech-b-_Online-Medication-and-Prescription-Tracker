import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DoctorAnalyticsComponent } from './doctor-analytics.component';

describe('DoctorAnalyticsComponent', () => {
  let component: DoctorAnalyticsComponent;
  let fixture: ComponentFixture<DoctorAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DoctorAnalyticsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DoctorAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
