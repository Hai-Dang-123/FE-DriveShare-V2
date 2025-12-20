# CORS Error - Backend Configuration Required

## ⚠️ Issue

When testing on **web browser** (http://localhost:8081), SignalR và API requests bị block bởi CORS policy:

```
Access to fetch at 'http://192.168.100.49:5246/hubs/tracking' 
from origin 'http://localhost:8081' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## ✅ Solution: Backend cần enable CORS

### Option 1: Enable CORS cho localhost (Development)

Trong `Program.cs` hoặc `Startup.cs`:

```csharp
// Add CORS services
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.WithOrigins(
            "http://localhost:8081",      // Expo web dev server
            "http://localhost:19006",     // Expo alternative port
            "http://127.0.0.1:8081"       // Alternative localhost
        )
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials();              // Required for SignalR
    });
});

// Enable CORS middleware (MUST be before MapHub!)
app.UseCors();

// Then SignalR
app.MapHub<TrackingHub>("/hubs/tracking");
```

### Option 2: Enable CORS cho tất cả origins (Chỉ dùng khi develop)

```csharp
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

app.UseCors();
```

⚠️ **Lưu ý**: Không nên dùng `AllowAnyOrigin()` trong production!

### Option 3: CORS cho Production (Recommended)

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        var allowedOrigins = builder.Configuration.GetSection("AllowedOrigins").Get<string[]>();
        
        policy.WithOrigins(allowedOrigins ?? Array.Empty<string>())
              .AllowAnyHeader()
              .AllowAnyMethod()
              .AllowCredentials();
    });
});

app.UseCors("AllowFrontend");
```

Trong `appsettings.json`:
```json
{
  "AllowedOrigins": [
    "http://localhost:8081",
    "https://your-production-domain.com"
  ]
}
```

## 📝 Current Workaround (Frontend)

Tạm thời frontend đã:
- ✅ Silent fail cho CORS errors (giảm noise trong console)
- ✅ Chỉ warn 1 lần về CORS issue
- ✅ App vẫn hoạt động bình thường trên mobile native (không bị CORS)

## 🔍 Affected Endpoints

1. SignalR Hub: `/hubs/tracking`
2. API endpoints: 
   - `/api/DriverWorkSession/check-eligibility`
   - Tất cả các API calls từ web browser

## ⚙️ Testing

Sau khi enable CORS, test lại:
1. Mở app trên web: `http://localhost:8081`
2. Check console - không còn CORS errors
3. SignalR connect thành công
4. API calls hoạt động bình thường

---

**Priority**: Medium (không ảnh hưởng mobile app, chỉ ảnh hưởng web testing)
**Team**: Backend
**Status**: Pending backend configuration
