class DigitalTwinService:
    def __init__(self):
        self.metrics = {
            "automation_index": 45,
            "compliance": 90,
            "risk": 15,
            "org_health": 85,
            "monthly_savings": 12000
        }
        
    def get_metrics(self):
        return self.metrics
        
    def update_metrics(self, deployment_result):
        # In a real scenario, this would recalculate based on the new deployed version
        self.metrics["automation_index"] = min(100, self.metrics["automation_index"] + 5)
        self.metrics["compliance"] = min(100, self.metrics["compliance"] + 2)
        self.metrics["risk"] = max(0, self.metrics["risk"] - 3)
        self.metrics["monthly_savings"] += 2500
        return self.metrics

digital_twin_service = DigitalTwinService()
