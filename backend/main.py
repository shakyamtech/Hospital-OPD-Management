import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore
from models import Patient, Doctor, AppointmentRequest

# Initialize FastAPI app
app = FastAPI(title="OPD Connect API", description="API for OPD Hospital App")

# Allow CORS for frontend requests (adjust origin for production)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firebase
# Ensure you download your service account key and place it in the backend folder as 'serviceAccountKey.json'
SERVICE_ACCOUNT_FILE = "serviceAccountKey.json"

try:
    if os.path.exists(SERVICE_ACCOUNT_FILE):
        cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
        try:
            firebase_admin.initialize_app(cred)
        except Exception:
            # Already initialized or other non-fatal initialization issue
            pass
        db = firestore.client()
        print("Successfully connected to Firebase Firestore.")
    else:
        print(f"Warning: {SERVICE_ACCOUNT_FILE} not found. Firebase operations will fail.")
        db = None
except Exception as e:
    print(f"Error initializing Firebase: {e}")
    db = None

@app.post("/api/patients")
async def register_patient(patient: Patient):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured (Service Account missing).")
    
    try:
        # Convert Pydantic model to dictionary
        patient_data = patient.model_dump()
        
        # Save to 'patients' collection
        doc_ref = db.collection("patients").document()
        doc_ref.set(patient_data)
        
        return {"message": "Patient registered successfully", "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register patient: {str(e)}")

@app.get("/api/patients")
async def get_patients():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured (Service Account missing).")
    
    try:
        patients_ref = db.collection("patients")
        docs = patients_ref.stream()
        
        patients_list = []
        for doc in docs:
            patient_dict = doc.to_dict()
            patient_dict["id"] = doc.id
            patients_list.append(patient_dict)
            
        return {"patients": patients_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve patients: {str(e)}")

@app.put("/api/patients/{patient_id}")
async def update_patient(patient_id: str, patient: Patient):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured (Service Account missing).")
    
    try:
        # Convert Pydantic model to dictionary
        patient_data = patient.model_dump()
        
        # Overwrite the document with the specific ID
        doc_ref = db.collection("patients").document(patient_id)
        doc_ref.set(patient_data)
        
        return {"message": "Patient updated successfully", "id": patient_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update patient: {str(e)}")

@app.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured (Service Account missing).")
    
    try:
        doc_ref = db.collection("patients").document(patient_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Patient not found.")
        
        patient_dict = doc.to_dict()
        patient_dict["id"] = doc.id
        return {"patient": patient_dict}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve patient: {str(e)}")

@app.delete("/api/patients/{patient_id}")
async def delete_patient(patient_id: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured (Service Account missing).")
    
    try:
        doc_ref = db.collection("patients").document(patient_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Patient not found.")
        
        doc_ref.delete()
        return {"message": "Patient deleted successfully", "id": patient_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete patient: {str(e)}")

@app.post("/api/doctors")
async def register_doctor(doctor: Doctor):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        doctor_data = doctor.model_dump()
        doc_ref = db.collection("doctors").document()
        doc_ref.set(doctor_data)
        return {"message": "Doctor added successfully", "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add doctor: {str(e)}")

@app.get("/api/doctors")
async def get_doctors():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        doctors_ref = db.collection("doctors")
        docs = doctors_ref.stream()
        doctors_list = []
        for doc in docs:
            d = doc.to_dict()
            d["id"] = doc.id
            doctors_list.append(d)
        return {"doctors": doctors_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve doctors: {str(e)}")

@app.delete("/api/doctors/{doctor_id}")
async def delete_doctor(doctor_id: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        doc_ref = db.collection("doctors").document(doctor_id)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Doctor not found.")
        doc_ref.delete()
        return {"message": "Doctor deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete doctor: {str(e)}")

@app.post("/api/appointment-requests")
async def create_appointment_request(request: AppointmentRequest):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        request_data = request.model_dump()
        doc_ref = db.collection("appointment_requests").document()
        doc_ref.set(request_data)
        return {"message": "Appointment request submitted successfully", "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit request: {str(e)}")

@app.get("/api/appointment-requests")
async def get_appointment_requests():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        reqs_ref = db.collection("appointment_requests")
        docs = reqs_ref.stream()
        reqs_list = []
        for doc in docs:
            r = doc.to_dict()
            r["id"] = doc.id
            reqs_list.append(r)
        return {"requests": reqs_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve requests: {str(e)}")

@app.put("/api/appointment-requests/{request_id}")
async def update_appointment_request(request_id: str, request: AppointmentRequest):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        request_data = request.model_dump()
        doc_ref = db.collection("appointment_requests").document(request_id)
        doc_ref.set(request_data)
        return {"message": "Appointment request updated successfully", "id": request_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update request: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8080, reload=True)
