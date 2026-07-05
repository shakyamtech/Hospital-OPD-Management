from pydantic import BaseModel
from typing import Optional, List

class Doctor(BaseModel):
    name: str
    specialization: str

class PersonalDetails(BaseModel):
    name: str
    age: int
    bloodGroup: str
    contact: str
    address: str

class GuardianDetails(BaseModel):
    name: Optional[str] = None
    contact: Optional[str] = None

class MedicalDetails(BaseModel):
    description: str
    previousIllness: Optional[str] = None
    medicines: Optional[str] = None
    tests: Optional[str] = None

class MedicineItem(BaseModel):
    name: str
    qty: int
    rate: float
    total: float

class AppointmentDetails(BaseModel):
    doctor: str
    blockWard: str
    time: str
    charges: float
    followupDate: Optional[str] = None
    followupTime: Optional[str] = None
    paymentStatus: str = "pending"
    pharmacyBill: Optional[List[MedicineItem]] = None
    pharmacyPaymentStatus: str = "pending"

class Patient(BaseModel):
    personal: PersonalDetails
    guardian: GuardianDetails
    medical: MedicalDetails
    appointment: AppointmentDetails
