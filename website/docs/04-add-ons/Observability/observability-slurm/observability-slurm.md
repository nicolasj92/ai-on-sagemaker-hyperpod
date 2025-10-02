---
title : "Observability with AMP and AMG (Slurm only)"
weight : 100
---

## Overview

SageMaker HyperPod can optionally be integrated with [Amazon Managed Prometheus](https://docs.aws.amazon.com/prometheus/latest/userguide/what-is-Amazon-Managed-Service-Prometheus.html) and [Amazon Managed Grafana](https://docs.aws.amazon.com/grafana/latest/userguide/what-is-Amazon-Managed-Service-Grafana.html) to export metrics about your cluster and cluster-nodes to an Amazon Managed Grafana dashboard. 

![hyperpod observability architecture](/img/06-observability/observability_architecture.png)

This solution uses CloudFormation to deploy workspaces for Amazon Managed Prometheus and Amazon Managed Grafana, and Hyperpod Lifecycle Scripts to install metrics exporters and OpenTelemetry Collector (OTEL) to your cluster. Also, you can install the solution to existing clusters as well by running commands interactively on the head node (Ad-hoc installation).

Not all metrics are enabled by default or displayed in your Amazon Managed Grafana workspace. Some metrics are categorized as **Advanced metrics**. Check the [SageMaker HyperPod cluster metrics](https://docs.aws.amazon.com/sagemaker/latest/dg/hyperpod-observability-cluster-metrics.html) page for more details.


## Setup

### 1. Enable IAM Identity Center

As a prerequisite to deploying this stack, you will need to have IAM Identity Center enabled for your account or organization. Amazon Managed Grafana uses IAM Identity Center to authenticate users to your dashboards. You can do this through the [IAM Identity Center AWS Console](https://console.aws.amazon.com/singlesignon). 

![Enable-IAM-Identity-Center](/img/00-setup/identity-center-enable.png)


### 2. Add additional permissions

Also, you need to add following additional permissions to the IAM role for HyperPod instance groups.

#### 2-a. Managed policy

```bash
AmazonPrometheusRemoteWriteAccess
```

#### 2-b. Inline policy

``` json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "VisualEditor0",
            "Effect": "Allow",
            "Action": [
                "ecr:BatchGetImage",
                "ecr:GetAuthorizationToken",
                "ecr:GetDownloadUrlForLayer"
            ],
            "Resource": "*"
        }
    ]
}
```

### 3. Create workspaces for Prometheus and Grafana

Use the button below to deploy the CloudFormation stack for your Amazon Managed Prometheus workspace and Amazon Managed Grafana workspace. It will automatically install pre-configured dashboards in your Grafana workspace. You can leave all parameters at their defaults.

:::caution Note
Make sure you deploy this stack in the region where your HyperPod cluster is located.
:::

<a 
  href="https://console.aws.amazon.com/cloudformation/home?#/stacks/quickcreate?templateURL=https://awsome-distributed-training.s3.amazonaws.com/templates/cluster-observability-ws.yaml&stackName=Cluster-Observability" 
  target="_blank" 
  rel="noopener noreferrer"
  style={{
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '50px',
    paddingLeft: '20px',
    paddingRight: '20px',
    backgroundColor: '#171bdfff',
    color: 'white',
    textDecoration: 'none',
    borderRadius: '25px',
    fontWeight: 'bold',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    boxShadow: '0 4px 12px rgba(98, 100, 221, 0.3)',
    transition: 'all 0.2s ease',
    textAlign: 'center',
    lineHeight: '1',
    fontFamily: 'inherit',
    margin: '0',
    padding: '0 20px',
    boxSizing: 'border-box'
  }}
>
  <span style={{
    display: 'block',
    lineHeight: '1',
    margin: '0',
    padding: '0',
    position: 'relative',
    top: '8px',
    textDecoration: 'underline'
  }}>
    Deploy HyperPod Observability Stack ↗
  </span>
</a>

<br/><br/>

:::note 
If you do not have Identity Center access, then please use the [open-source Grafana](https://github.com/aws-samples/awsome-distributed-training/blob/main/4.validation_and_observability/4.prometheus-grafana/cluster-observability-os-grafana.yaml).
:::

### 4. Add users to the Grafana workspace

From the [Management Console for Amazon Managed Grafana](https://console.aws.amazon.com/grafana/home#/workspaces), select the workspace you just created by the CloudFormation.

Select the **Configure users and groups** button and add your user.

![add-user-1](/img/06-observability/add-user-1.png)

From the **Action** menu, select **Assign user** and **Make admin** to configure users for who need access to the Grafana workspace.

![add-user-2](/img/06-observability/add-user-2.png)



### 5. Modify the lifecycle scripts

To install the metric exporters and OTEL collector on your cluster, edit the lifecycle scripts for the cluster by following these steps:

1. Locate the Prometheus remote write URL in the `Outputs` tab of the CloudFormation stack you just deployed. You will use the URL to configure the lifecycle scripts.

    ![prometheus-remote-write-url](/img/06-observability/prometheus-remote-write-url.png)


1. If you don't have a copy of the lifecycle scripts locally, download them to your development machine so you can edit.

    ``` bash
    aws s3 sync s3://{bucket-name}/ ./{local-working-directory}
    ```

1. Open the `config.py` file with your text editor, and change the value `Config.enable_observability` to `True`.

    ``` python
    class Config:
            :
        enable_observability = True
            :
    ```

1. Change the parameters of `ObservabilityConfig`. Use the Prometheus remote write URL you located at the first step.

    ``` python
    class ObservabilityConfig:

        # Prometheus remote write URL
        prometheus_remote_write_url = "https://aps-workspaces.us-west-2.amazonaws.com/workspaces/{your-workspace-id}/api/v1/remote_write"

        # Set true if you want to collect advanced metrics
        advanced_metrics = True
    ```

1. Upload the lifecycle script to S3

    ``` bash
    aws s3 sync ./{local-working-directory} s3://{bucket-name}/
    ```

    :::note
    Updating the lifecycle script is important because the metric exporters and OTEL collector have to be automatically configured in new cluster nodes, when your cluster replaces nodes, scales up, and applying software updates.
    :::


### 6. Install Observability in your cluster

There are two options for installing observabability on a your HyperPod cluster, depending on where you are creating a new cluster from now or installing the observability on an existing cluster.


#### 6-1. Create a new cluster

If you are creating a new HyperPod cluster, use the lifecycle scripts you updated in the steps above. The lifecycle scripts will install necessary components (metrics exporters and OTEL collector) in your cluster.
    

#### 6-2. Ad-hoc installation

You can also enable Observability for an existing cluster by following these steps.

1. Login to the **head node** by SSM or SSH.

1. Set environment variables based on the number of worker nodes you have.

    ``` bash
    # Number of worker nodes you have
    export NUM_WORKERS=16

    # Prometheus remote write URL you configured in the lifecycle script config.
    export PROMETHEUS_REMOTE_WRITE_URL=https://aps-workspaces.us-west-2.amazonaws.com/workspaces/{your-workspace-id}/api/v1/remote_write

    # Set `--advanced` if you configured `advanced_metrics` to True in the lifecycle script config.
    export ARG_ADVANCED=--advanced
    ```

1. Make sure the Linux user you are using has sudo priviledge on both head node and worker nodes.

    ``` bash
    sudo hostname
    srun -N $NUM_WORKERS sudo hostname
    ```

1. Clone the `https://github.com/aws-samples/awsome-distributed-training.git` repository under a shared file system.

    ``` bash
    mkdir ~/observability-setup
    cd ~/observability-setup
    git clone https://github.com/aws-samples/awsome-distributed-training.git
    cd awsome-distributed-training/1.architectures/5.sagemaker-hyperpod/LifecycleScripts/base-config/observability
    ```

1. Stop observability components if they are running already running

    ``` bash
    sudo python3 stop_observability.py --node-type controller
    srun -N $NUM_WORKERS sudo python3 stop_observability.py --node-type compute
    ```

1. Install and run observability components

    ``` bash
    sudo python3 install_observability.py --node-type controller --prometheus-remote-write-url $PROMETHEUS_REMOTE_WRITE_URL $ARG_ADVANCED
    srun -N $NUM_WORKERS sudo python3 install_observability.py --node-type compute --prometheus-remote-write-url $PROMETHEUS_REMOTE_WRITE_URL $ARG_ADVANCED
    ```

1. Verify status of containers and services

    ``` bash
    systemctl status slurm_exporter.service --no-pager -l
    docker ps
    srun -N $NUM_WORKERS docker ps
    ```

    **Example output**
    ``` text
    ● slurm_exporter.service - Prometheus SLURM Exporter
        Loaded: loaded (/etc/systemd/system/slurm_exporter.service; enabled; vendor preset: enabled)
        Active: active (running) since Thu 2025-09-11 04:27:30 UTC; 1 day 20h ago
    Main PID: 2408455 (slurm_exporter)
        Tasks: 39 (limit: 152887)
        Memory: 12.0M
            CPU: 35min 28.668s
        CGroup: /system.slice/slurm_exporter.service
                └─2408455 /usr/bin/slurm_exporter

    Sep 11 04:27:30 ip-10-1-206-211 slurm_exporter[2408455]: time=2025-09-11T04:27:30.540Z level=INFO msg="Collector enabled" collector=users
    Sep 11 04:27:30 ip-10-1-206-211 slurm_exporter[2408455]: time=2025-09-11T04:27:30.540Z level=INFO msg="Collector enabled" collector=info
    Sep 11 04:27:30 ip-10-1-206-211 slurm_exporter[2408455]: time=2025-09-11T04:27:30.540Z level=INFO msg="Collector enabled" collector=gpus
    Sep 11 04:27:30 ip-10-1-206-211 slurm_exporter[2408455]: time=2025-09-11T04:27:30.540Z level=INFO msg="Collector enabled" collector=cpus
    Sep 11 04:27:30 ip-10-1-206-211 slurm_exporter[2408455]: time=2025-09-11T04:27:30.540Z level=INFO msg="Collector enabled" collector=nodes
    Sep 11 04:27:30 ip-10-1-206-211 slurm_exporter[2408455]: time=2025-09-11T04:27:30.540Z level=INFO msg="Collector enabled" collector=queue
    Sep 11 04:27:30 ip-10-1-206-211 slurm_exporter[2408455]: time=2025-09-11T04:27:30.540Z level=INFO msg="Starting Slurm Exporter server..."
    Sep 11 04:27:30 ip-10-1-206-211 slurm_exporter[2408455]: time=2025-09-11T04:27:30.540Z level=INFO msg="Command timeout configured" timeout=5s
    Sep 11 04:27:30 ip-10-1-206-211 slurm_exporter[2408455]: time=2025-09-11T04:27:30.540Z level=INFO msg="" level=info msg="Listening on" address=[::]:9341
    Sep 11 04:27:30 ip-10-1-206-211 slurm_exporter[2408455]: time=2025-09-11T04:27:30.541Z level=INFO msg="" level=info msg="TLS is disabled." http2=false address=[::>

    CONTAINER ID   IMAGE                                                                                 COMMAND                  CREATED        STATUS        PORTS     NAMES
    da773247a262   602401143452.dkr.ecr.us-west-2.amazonaws.com/hyperpod/otel_collector:v1754424030352   "/app/otelcollector …"   6 hours ago    Up 6 hours              otel-collector
    8c18b89cc1a3   602401143452.dkr.ecr.us-west-2.amazonaws.com/hyperpod/node_exporter:v1.9.1            "/bin/node_exporter …"   45 hours ago   Up 45 hours             node-exporter

    CONTAINER ID   IMAGE                                                                                  COMMAND                  CREATED        STATUS        PORTS     NAMES
    eb4fa31d8b17   602401143452.dkr.ecr.us-west-2.amazonaws.com/hyperpod/otel_collector:v1754424030352    "/app/otelcollector …"   45 hours ago   Up 45 hours             otel-collector
    3ac63a09ba1f   602401143452.dkr.ecr.us-west-2.amazonaws.com/hyperpod/efa_exporter:1.0.0               "./node_exporter --p…"   45 hours ago   Up 45 hours             efa-exporter
    48396ed3e3ef   602401143452.dkr.ecr.us-west-2.amazonaws.com/hyperpod/dcgm_exporter:4.1.1-4.0.4-ubi9   "/usr/local/dcgm/dcg…"   45 hours ago   Up 45 hours             dcgm-exporter
    216eff1c9d55   602401143452.dkr.ecr.us-west-2.amazonaws.com/hyperpod/node_exporter:v1.9.1             "/bin/node_exporter …"   45 hours ago   Up 45 hours             node-exporter
        :
    ```

### 7. Verification

From the [Management Console for Amazon Managed Grafana](https://console.aws.amazon.com/grafana/home#/workspaces), select the workspace URL to open the dashboards. When the Sign-in screen pops up, login as a user you assigned in the **Add users to the Grafana workspace** step above.

![sign-in](/img/06-observability/sign-in.png)

From the left navigation pane, select **Dashboards**, and choose one of pre-configured dashboards. Following is a sample screenshot of the **NVIDIA DCGM Exporter Dashboard**.

![dcgm-dashboard](/img/06-observability/dcgm-dashboard.png)


## Next steps

* As needed, you can modify the pre-configured dashboards to meet your requirements. See the external [Grafana document](https://grafana.com/docs/grafana-cloud/visualizations/dashboards/) for more details.

* Amazon Managed Grafana includes access to an updated alerting system that centralizes alerting information in a single, searchable view (in the navigation pane, choose Alerts to create an alert). Alerting is useful when you want to receive timely notifications, such as when GPU utilization drops unexpectedly, when a disk usage of your shared file system exceeds 90%, when multiple instances become unavailable at the same time, and so on. You can create alert rules based on metrics or queries and set up multiple notification channels, such as emails and Slack messages. For instructions on setting up alerts with Slack messages, see the [Setting Up Slack Alerts for Amazon Managed Grafana](https://github.com/aws-samples/awsome-distributed-training/blob/main/4.validation_and_observability/4.prometheus-grafana/README-grafana-alerts.md) GitHub page.

* The number of alerts is limited to 100 per Grafana workspace. If you need a more scalable solution, check out the [alerting options in Amazon Managed Service for Prometheus](https://docs.aws.amazon.com/prometheus/latest/userguide/AMP-Ruler.html).
