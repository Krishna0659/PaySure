from app.main import app
print("Backend imports OK - all routers loaded")
print("Routes registered:")
for route in app.routes:
    if hasattr(route, 'path'):
        print(f"  {route.path}")
