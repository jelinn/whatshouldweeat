#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Meals App K3s Deployment ===${NC}\n"

# Check if k3s is installed
if ! command -v kubectl &> /dev/null; then
    echo -e "${RED}kubectl not found. Is k3s installed?${NC}"
    echo "Install k3s with: curl -sfL https://get.k3s.io | sh -"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "deployment.yaml" ]; then
    echo -e "${RED}Please run this script from the k8s directory${NC}"
    exit 1
fi

# Check if secrets have been configured
if grep -q "REPLACE-WITH-YOUR-KEY" secrets.yaml; then
    echo -e "${YELLOW}WARNING: You need to edit secrets.yaml with your actual API key${NC}"
    echo "Edit k8s/secrets.yaml and replace 'sk-ant-REPLACE-WITH-YOUR-KEY' with your actual key"
    read -p "Press Enter after you've updated the file, or Ctrl+C to cancel..."
fi

# Check if image exists
if ! sudo k3s ctr images list | grep -q "meals:latest"; then
    echo -e "${YELLOW}Image 'meals:latest' not found in k3s${NC}"
    echo "Building and importing image..."

    # Go to project root and build
    cd ..

    if command -v docker &> /dev/null; then
        echo "Building with Docker..."
        sudo docker build -t meals:latest .
        echo "Importing to k3s..."
        sudo docker save meals:latest | sudo k3s ctr images import -
    else
        echo -e "${RED}Docker not found. Please install Docker or build the image manually.${NC}"
        echo "Install Docker: sudo apt install -y docker.io"
        exit 1
    fi

    cd k8s
    echo -e "${GREEN}Image built and imported successfully${NC}"
fi

# Apply manifests
echo -e "\n${GREEN}Applying Kubernetes manifests...${NC}"
kubectl apply -k .

# Wait for deployment
echo -e "\n${GREEN}Waiting for deployment to be ready...${NC}"
kubectl rollout status deployment/meals -n homelab --timeout=120s

# Show status
echo -e "\n${GREEN}=== Deployment Complete ===${NC}\n"
kubectl get all -n homelab

# Get access info
echo -e "\n${GREEN}=== Access Information ===${NC}"
NODE_IP=$(kubectl get nodes -o jsonpath='{.items[0].status.addresses[?(@.type=="InternalIP")].address}')
echo -e "Direct access: ${YELLOW}http://${NODE_IP}${NC}"
echo -e "With DNS:      ${YELLOW}http://meals.home${NC} (requires local DNS setup)"

echo -e "\n${GREEN}Useful commands:${NC}"
echo "  View logs:     kubectl logs -n homelab -l app=meals -f"
echo "  Shell access:  kubectl exec -it -n homelab deployment/meals -- sh"
echo "  Restart:       kubectl rollout restart deployment/meals -n homelab"
echo "  Delete:        kubectl delete -k ."
