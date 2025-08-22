{{/*
Expand the name of the chart.
*/}}
{{- define "intelgraph.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "intelgraph.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "intelgraph.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "intelgraph.labels" -}}
helm.sh/chart: {{ include "intelgraph.chart" . }}
{{ include "intelgraph.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/part-of: intelgraph
{{- end }}

{{/*
Selector labels
*/}}
{{- define "intelgraph.selectorLabels" -}}
app.kubernetes.io/name: {{ include "intelgraph.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service labels for a specific service
*/}}
{{- define "intelgraph.serviceLabels" -}}
{{- $serviceName := .serviceName -}}
helm.sh/chart: {{ include "intelgraph.chart" .root }}
app.kubernetes.io/name: {{ $serviceName }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- if .root.Chart.AppVersion }}
app.kubernetes.io/version: {{ .root.Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
app.kubernetes.io/part-of: intelgraph
app.kubernetes.io/component: {{ $serviceName }}
{{- end }}

{{/*
Service selector labels
*/}}
{{- define "intelgraph.serviceSelectorLabels" -}}
{{- $serviceName := .serviceName -}}
app.kubernetes.io/name: {{ $serviceName }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "intelgraph.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "intelgraph.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Image name helper
*/}}
{{- define "intelgraph.image" -}}
{{- $service := .service -}}
{{- $root := .root -}}
{{- printf "%s/%s:%s" $root.Values.global.imageRegistry $service.image $root.Values.global.tag }}
{{- end }}

{{/*
Common environment variables
*/}}
{{- define "intelgraph.commonEnv" -}}
{{- range .Values.common.env }}
- name: {{ .name }}
  {{- if .value }}
  value: {{ tpl .value . | quote }}
  {{- else if .valueFrom }}
  valueFrom: {{- toYaml .valueFrom | nindent 4 }}
  {{- end }}
{{- end }}
{{- end }}

{{/*
Service-specific environment variables
*/}}
{{- define "intelgraph.serviceEnv" -}}
{{- $service := .service -}}
{{- $root := .root -}}
{{- range $service.env }}
- name: {{ .name }}
  {{- if .value }}
  value: {{ tpl .value $root | quote }}
  {{- else if .valueFrom }}
  valueFrom: {{- toYaml .valueFrom | nindent 4 }}
  {{- end }}
{{- end }}
{{- end }}

{{/*
Security context
*/}}
{{- define "intelgraph.securityContext" -}}
{{- toYaml .Values.global.securityContext }}
{{- end }}

{{/*
Pod security context
*/}}
{{- define "intelgraph.podSecurityContext" -}}
{{- toYaml .Values.global.podSecurityContext }}
{{- end }}

{{/*
Resource limits
*/}}
{{- define "intelgraph.resources" -}}
{{- $service := .service -}}
{{- if $service.resources }}
{{- toYaml $service.resources }}
{{- else }}
{{- toYaml .root.Values.common.resources }}
{{- end }}
{{- end }}

{{/*
Liveness probe
*/}}
{{- define "intelgraph.livenessProbe" -}}
{{- $service := .service -}}
{{- $probe := $service.livenessProbe | default .root.Values.common.livenessProbe -}}
httpGet:
  path: {{ $probe.httpGet.path }}
  port: {{ $probe.httpGet.port }}
  scheme: HTTP
initialDelaySeconds: {{ $probe.initialDelaySeconds }}
periodSeconds: {{ $probe.periodSeconds }}
timeoutSeconds: {{ $probe.timeoutSeconds }}
failureThreshold: {{ $probe.failureThreshold }}
{{- end }}

{{/*
Readiness probe
*/}}
{{- define "intelgraph.readinessProbe" -}}
{{- $service := .service -}}
{{- $probe := $service.readinessProbe | default .root.Values.common.readinessProbe -}}
httpGet:
  path: {{ $probe.httpGet.path }}
  port: {{ $probe.httpGet.port }}
  scheme: HTTP
initialDelaySeconds: {{ $probe.initialDelaySeconds }}
periodSeconds: {{ $probe.periodSeconds }}
timeoutSeconds: {{ $probe.timeoutSeconds }}
failureThreshold: {{ $probe.failureThreshold }}
{{- end }}

{{/*
Volume mounts
*/}}
{{- define "intelgraph.volumeMounts" -}}
{{- toYaml .Values.common.volumeMounts }}
{{- end }}

{{/*
Volumes
*/}}
{{- define "intelgraph.volumes" -}}
{{- toYaml .Values.common.volumes }}
{{- end }}

{{/*
Pod annotations
*/}}
{{- define "intelgraph.podAnnotations" -}}
{{- $service := .service -}}
{{- $annotations := .root.Values.common.podAnnotations -}}
{{- if $service.podAnnotations }}
{{- $annotations = merge $annotations $service.podAnnotations }}
{{- end }}
{{- range $key, $value := $annotations }}
{{ $key }}: {{ tpl $value $.root | quote }}
{{- end }}
{{- end }}

{{/*
Pod labels
*/}}
{{- define "intelgraph.podLabels" -}}
{{- $service := .service -}}
{{- $labels := .root.Values.common.podLabels -}}
{{- if $service.podLabels }}
{{- $labels = merge $labels $service.podLabels }}
{{- end }}
{{- range $key, $value := $labels }}
{{ $key }}: {{ tpl $value $.root | quote }}
{{- end }}
{{- end }}

{{/*
Checksum for config changes
*/}}
{{- define "intelgraph.configChecksum" -}}
checksum/config: {{ include (print $.Template.BasePath "/configmap.yaml") . | sha256sum }}
{{- end }}