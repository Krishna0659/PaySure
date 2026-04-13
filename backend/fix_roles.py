import sys
import os

# Add the project root to sys.path so we can import 'app'
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.db.session import SessionLocal
from app.models.user import User, UserRole

def main():
    db = SessionLocal()
    users = db.query(User).all()
    
    modified = False
    print("--- Current Roles ---")
    for u in users:
        print(f"[{u.id}] {u.full_name} ({u.email}) - {u.role}")
        
        # We need to make sure Krishna is a Freelancer
        if u.full_name and "Krishna" in u.full_name:
            if u.role != UserRole.freelancer:
                print(f" >> Modifying {u.full_name} to be a freelancer...")
                u.role = UserRole.freelancer
                modified = True
                
        # Make sure Saurabh is a Client
        if u.full_name and "Saurabh" in u.full_name:
            if u.role != UserRole.client:
                print(f" >> Modifying {u.full_name} to be a client...")
                u.role = UserRole.client
                modified = True
                
    if modified:
        db.commit()
        print("\nSuccessfully updated database logic and committed changes!")
    else:
        print("\nNo database changes required!")

if __name__ == "__main__":
    main()
