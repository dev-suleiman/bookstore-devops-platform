#!/bin/bash

set -e

echo "Creating observability namespace..."
kubectl create namespace bookstore-observability --dry-run=client -o yaml | kubectl apply -f -

echo "Adding Helm repos..."
helm repo add grafana https://grafana.github.io/helm-charts
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add jaegertracing https://jaegertracing.github.io/helm-charts
helm repo update

echo "Installing Loki..."
helm upgrade --install loki grafana/loki \
  --namespace bookstore-observability \
  --set loki.auth_enabled=false \
  --set deploymentMode=SingleBinary \
  --set loki.commonConfig.replication_factor=1 \
  --set singleBinary.replicas=1 \
  --set loki.storage.type=filesystem \
  --set loki.useTestSchema=true \
  --set minio.enabled=false \
  --set backend.replicas=0 \
  --set read.replicas=0 \
  --set write.replicas=0 \
  --set chunksCache.enabled=false \
  --set resultsCache.enabled=false

echo "Installing Promtail..."
helm upgrade --install promtail grafana/promtail \
  --namespace bookstore-observability \
  --set config.clients[0].url=http://loki-gateway.bookstore-observability.svc.cluster.local/loki/api/v1/push

echo "Installing Prometheus..."
helm upgrade --install prometheus prometheus-community/prometheus \
  --namespace bookstore-observability \
  --set server.service.type=ClusterIP \
  --set alertmanager.enabled=false \
  --set prometheus-pushgateway.enabled=false \
  --set server.persistentVolume.enabled=false

echo "Installing Jaeger..."
helm upgrade --install jaeger jaegertracing/jaeger \
  --namespace bookstore-observability \
  --set allInOne.enabled=true \
  --set provisionDataStore.cassandra=false \
  --set provisionDataStore.elasticsearch=false \
  --set storage.type=memory \
  --set agent.enabled=false \
  --set collector.enabled=false \
  --set query.enabled=false

echo "Installing Grafana..."
helm upgrade --install grafana grafana/grafana \
  --namespace bookstore-observability \
  --set adminPassword=admin \
  --set service.type=NodePort \
  --set service.nodePort=32000

echo "Done. Grafana available at http://localhost:32000"
echo "Login: admin / admin"
echo "Data sources to add manually:"
echo "  Loki:       http://loki-gateway.bookstore-observability.svc.cluster.local"
echo "  Prometheus: http://prometheus-server.bookstore-observability.svc.cluster.local"
echo "  Jaeger:     http://jaeger.bookstore-observability.svc.cluster.local:16686"
echo ""
echo "Port-forward Jaeger UI:"
echo "  kubectl port-forward -n bookstore-observability svc/jaeger 16686:16686"