import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import firebase_admin
from firebase_admin import credentials, firestore
try:
    from backend.models import Patient, Doctor, AppointmentRequest, Medicine, DispenseRequest, DirectDispenseRequest
except ImportError:
    from models import Patient, Doctor, AppointmentRequest, Medicine, DispenseRequest, DirectDispenseRequest

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
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_FILE = os.path.join(BASE_DIR, "serviceAccountKey.json")

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
        
        # Save to 'patients' collection with custom formatted OPD ID (e.g. OPD-2026-0001)
        from datetime import datetime
        year = datetime.now().year
        patients_ref = db.collection("patients")
        count = len(list(patients_ref.stream())) + 1
        opd_id = f"OPD-{year}-{count:04d}"
        
        doc_ref = patients_ref.document(opd_id)
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

# ================= PHARMACY INVENTORY & SALES ENDPOINTS =================

@app.get("/api/pharmacy/medicines")
async def get_medicines():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        meds_ref = db.collection("medicines")
        docs = meds_ref.stream()
        medicines_list = []
        for doc in docs:
            m = doc.to_dict()
            m["id"] = doc.id
            medicines_list.append(m)
        return {"medicines": medicines_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve medicines: {str(e)}")

@app.post("/api/pharmacy/medicines")
async def add_medicine(med: Medicine):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        med_data = med.model_dump()
        doc_ref = db.collection("medicines").document()
        doc_ref.set(med_data)
        return {"message": "Medicine added successfully", "id": doc_ref.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add medicine: {str(e)}")

@app.put("/api/pharmacy/medicines/{medicine_id}")
async def update_medicine(medicine_id: str, med: Medicine):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        med_data = med.model_dump()
        doc_ref = db.collection("medicines").document(medicine_id)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Medicine not found.")
        doc_ref.set(med_data)
        return {"message": "Medicine updated successfully", "id": medicine_id}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update medicine: {str(e)}")

@app.delete("/api/pharmacy/medicines/{medicine_id}")
async def delete_medicine(medicine_id: str):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        doc_ref = db.collection("medicines").document(medicine_id)
        if not doc_ref.get().exists:
            raise HTTPException(status_code=404, detail="Medicine not found.")
        doc_ref.delete()
        return {"message": "Medicine deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete medicine: {str(e)}")

@app.post("/api/pharmacy/dispense/{patient_id}")
async def dispense_medicines(patient_id: str, req: DispenseRequest):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        # Get patient doc
        patient_ref = db.collection("patients").document(patient_id)
        patient_doc = patient_ref.get()
        if not patient_doc.exists:
            raise HTTPException(status_code=404, detail="Patient not found.")
        
        patient_data = patient_doc.to_dict()
        
        # Verify and update medicine stocks
        medicines_ref = db.collection("medicines")
        med_docs_stream = medicines_ref.stream()
        meds_by_name = {}
        meds_by_id = {}
        for d in med_docs_stream:
            m_dict = d.to_dict()
            m_dict["_doc_id"] = d.id
            meds_by_name[m_dict.get("name", "").strip().lower()] = m_dict
            meds_by_id[d.id] = m_dict

        # Process each item in prescription/dispense bill
        for item in req.items:
            m_name_lower = item.name.strip().lower()
            matched_med = meds_by_name.get(m_name_lower)
            if matched_med:
                doc_id = matched_med["_doc_id"]
                current_rem = matched_med.get("remaining_stock", 0)
                current_sold = matched_med.get("sold_qty", 0)
                
                new_rem = max(0, current_rem - item.qty)
                new_sold = current_sold + item.qty
                
                # Update medicine stock doc
                medicines_ref.document(doc_id).update({
                    "remaining_stock": new_rem,
                    "sold_qty": new_sold
                })

        # Update patient document pharmacy payment status and pharmacy bill
        patient_data["appointment"]["pharmacyPaymentStatus"] = "paid"
        items_dict = [it.model_dump() for it in req.items]
        patient_data["appointment"]["pharmacyBill"] = items_dict
        patient_ref.set(patient_data)

        # Record sales log
        import datetime
        sale_log = {
            "patient_id": patient_id,
            "patient_name": patient_data.get("personal", {}).get("name", "Unknown"),
            "items": items_dict,
            "grand_total": req.grand_total,
            "timestamp": datetime.datetime.now().isoformat()
        }
        db.collection("pharmacy_sales").document().set(sale_log)

        return {"message": "Medicines dispensed and stock updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispense medicines: {str(e)}")

@app.post("/api/pharmacy/dispense-direct")
async def dispense_direct_sale(req: DirectDispenseRequest):
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured (Service Account missing).")
    try:
        # Verify and update medicine stocks
        medicines_ref = db.collection("medicines")
        med_docs_stream = medicines_ref.stream()
        meds_by_name = {}
        for d in med_docs_stream:
            m_dict = d.to_dict()
            m_dict["_doc_id"] = d.id
            meds_by_name[m_dict.get("name", "").strip().lower()] = m_dict

        # Process each item
        for item in req.items:
            m_name_lower = item.name.strip().lower()
            matched_med = meds_by_name.get(m_name_lower)
            if matched_med:
                doc_id = matched_med["_doc_id"]
                current_rem = matched_med.get("remaining_stock", 0)
                current_sold = matched_med.get("sold_qty", 0)
                
                new_rem = max(0, current_rem - item.qty)
                new_sold = current_sold + item.qty
                
                medicines_ref.document(doc_id).update({
                    "remaining_stock": new_rem,
                    "sold_qty": new_sold
                })

        # Record sales log
        import datetime
        items_dict = [it.model_dump() for it in req.items]
        cust_name = req.customer_name.strip() if req.customer_name and req.customer_name.strip() else "Walk-in Customer"
        sale_log = {
            "patient_id": "COUNTER-SALE",
            "patient_name": cust_name,
            "contact": req.contact or "",
            "items": items_dict,
            "grand_total": req.grand_total,
            "timestamp": datetime.datetime.now().isoformat()
        }
        db.collection("pharmacy_sales").document().set(sale_log)

        return {"message": "Direct sale processed and stock updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process direct sale: {str(e)}")

@app.post("/api/pharmacy/medicines/reset-sold-qty")
async def reset_sold_qty():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        meds_ref = db.collection("medicines")
        docs = list(meds_ref.stream())
        reset_count = 0
        for doc in docs:
            m = doc.to_dict()
            total_stock = m.get("total_stock", 0)
            doc.reference.update({
                "sold_qty": 0,
                "remaining_stock": total_stock
            })
            reset_count += 1
        return {"message": f"Sold quantities reset for {reset_count} medicine(s).", "count": reset_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to reset sold quantities: {str(e)}")

@app.post("/api/pharmacy/medicines/clear-all")
@app.delete("/api/pharmacy/medicines/clear-all")
async def clear_all_medicines():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        meds_ref = db.collection("medicines")
        docs = list(meds_ref.stream())
        deleted_count = 0
        for doc in docs:
            doc.reference.delete()
            deleted_count += 1
        return {"message": f"All {deleted_count} medicine(s) removed from inventory.", "count": deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear all medicines: {str(e)}")

@app.get("/api/pharmacy/sales")
async def get_pharmacy_sales():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        sales_ref = db.collection("pharmacy_sales")
        docs = sales_ref.stream()
        sales_list = []
        for doc in docs:
            s = doc.to_dict()
            s["id"] = doc.id
            sales_list.append(s)
        return {"sales": sales_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve sales logs: {str(e)}")

@app.post("/api/pharmacy/sales/clear-all")
@app.delete("/api/pharmacy/sales/clear-all")
async def clear_all_sales_logs():
    if db is None:
        raise HTTPException(status_code=500, detail="Database not configured.")
    try:
        sales_ref = db.collection("pharmacy_sales")
        docs = list(sales_ref.stream())
        deleted_count = 0
        for doc in docs:
            doc.reference.delete()
            deleted_count += 1
        return {"message": f"All {deleted_count} sales log(s) cleared.", "count": deleted_count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to clear sales logs: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)



