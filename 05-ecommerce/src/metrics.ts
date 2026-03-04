
/**
 * In a production environment, this data would be exported in a format 
 * like Prometheus, Datadog, or CloudWatch. For this build, we will 
 * track them in memory and expose them for our dashboard.
 */
export class EcommerceMetrics {
  static paymentAttempts = 0;
  static paymentSuccesses = 0;
  static checkoutLatenciesMs: number[] = [];

  /**
   * 1. Track Payment Success Rate
   * Call this from the Reliability module every time a payment gateway returns a result.
   */
  static recordPaymentResult(success: boolean) {
    this.paymentAttempts++;
    if (success) {
      this.paymentSuccesses++;
    }
    
    const successRate = (this.paymentSuccesses / this.paymentAttempts) * 100;
    
    // Alerting Threshold Logic (from ADR-030)
    if (this.paymentAttempts > 10 && successRate < 99) {
      console.warn(`[ALERT] Payment Success Rate dropped to ${successRate.toFixed(2)}%!`);
    } else {
      console.log(`[Metrics] Payment Success Rate: ${successRate.toFixed(2)}%`);
    }
  }

  /**
   * 2. Track Checkout Latency
   * Call this from the Orchestrator after Reserve -> Charge -> Finalize completes.
   */
  static recordCheckoutLatency(latencyMs: number) {
    this.checkoutLatenciesMs.push(latencyMs);
    
    // Alerting Threshold Logic (from ADR-030)
    if (latencyMs > 800) {
      console.warn(`[ALERT] Checkout latency breached 800ms threshold: took ${latencyMs}ms!`);
    } else {
      console.log(`[Metrics] Checkout completed in ${latencyMs}ms`);
    }
  }

  /**
   * 3. Expose /metrics
   * This outputs the raw data that Grafana will scrape to build the dashboard.
   */
  static exportMetrics() {
    return {
      paymentAttempts: this.paymentAttempts,
      paymentSuccesses: this.paymentSuccesses,
      paymentSuccessRate: this.paymentAttempts === 0 ? 100 : (this.paymentSuccesses / this.paymentAttempts) * 100,
      totalCheckouts: this.checkoutLatenciesMs.length,
      // Grafana usually calculates percentiles (p95) using histograms, 
      // but we return the raw array here for our local dashboard testing.
      rawLatencies: this.checkoutLatenciesMs 
    };
  }
}