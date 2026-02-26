# K3s Deployment for Meals App

## Prerequisites

1. Ubuntu server with k3s installed:
   ```bash
   curl -sfL https://get.k3s.io | sh -
   ```

2. Docker (for building the image):
   ```bash
   sudo apt install -y docker.io
   ```

3. kubectl configured for your user:
   ```bash
   mkdir -p ~/.kube
   sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
   sudo chown $USER:$USER ~/.kube/config
   ```

## Quick Start

1. **Copy project to server:**
   ```bash
   scp -r /path/to/whatshouldweeat user@server:~/apps/
   ```

2. **Edit secrets:**
   ```bash
   cd ~/apps/whatshouldweeat/k8s
   nano secrets.yaml
   # Replace sk-ant-REPLACE-WITH-YOUR-KEY with your actual Anthropic API key
   ```

3. **Deploy:**
   ```bash
   chmod +x deploy.sh
   ./deploy.sh
   ```

## Manual Deployment

If you prefer to run commands manually:

```bash
# Build and import image
cd ~/apps/whatshouldweeat
sudo docker build -t meals:latest .
sudo docker save meals:latest | sudo k3s ctr images import -

# Apply manifests
cd k8s
kubectl apply -k .

# Check status
kubectl get all -n homelab
```

## Accessing the App

- **Direct IP:** `http://<server-ip>` (Traefik routes to the app)
- **With DNS:** `http://meals.home` (requires local DNS configuration)

## Common Operations

### View logs
```bash
kubectl logs -n homelab -l app=meals -f
```

### Restart the app
```bash
kubectl rollout restart deployment/meals -n homelab
```

### Shell into the container
```bash
kubectl exec -it -n homelab deployment/meals -- sh
```

### Update the app
```bash
# Rebuild image
cd ~/apps/whatshouldweeat
sudo docker build -t meals:latest .
sudo docker save meals:latest | sudo k3s ctr images import -

# Restart deployment to pick up new image
kubectl rollout restart deployment/meals -n homelab
```

### View persistent data
```bash
# Find the PV location
kubectl get pv -n homelab

# Data is stored in /var/lib/rancher/k3s/storage/
sudo ls /var/lib/rancher/k3s/storage/
```

### Delete everything
```bash
cd ~/apps/whatshouldweeat/k8s
kubectl delete -k .
```

## Troubleshooting

### Pod won't start
```bash
kubectl describe pod -n homelab -l app=meals
kubectl logs -n homelab -l app=meals --previous
```

### Image not found
```bash
# Verify image is imported
sudo k3s ctr images list | grep meals

# Re-import if needed
sudo docker save meals:latest | sudo k3s ctr images import -
```

### Can't access the app
```bash
# Check ingress
kubectl get ingress -n homelab

# Check service
kubectl get svc -n homelab

# Check pod is running
kubectl get pods -n homelab
```

## File Structure

```
k8s/
├── namespace.yaml    # Creates 'homelab' namespace
├── secrets.yaml      # API keys (edit this!)
├── storage.yaml      # Persistent volume for SQLite
├── deployment.yaml   # Main app deployment
├── service.yaml      # Internal service
├── ingress.yaml      # Traefik ingress for external access
├── kustomization.yaml# Kustomize config (applies all files)
├── deploy.sh         # Automated deployment script
└── README.md         # This file
```
