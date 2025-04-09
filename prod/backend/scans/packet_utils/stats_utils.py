class StatsUtils:

    def calculate_weighted_average(self, existing_value, existing_weight, new_value, new_weight):
        total_weight = existing_weight + new_weight
        if total_weight == 0:
            return 0
        return round(((existing_value * existing_weight) + (new_value * new_weight)) / total_weight, 3)

    def update_running_stats(self, n, mean, M2, new_value):
        """Use Welford's Method to calculate running mean, variance, and standard deviation"""
        n += 1  
        delta = new_value - mean
        mean += delta / n
        delta2 = new_value - mean
        M2 += delta * delta2
        variance = M2 / max(1, n - 1)
        stddev = variance ** 0.5
        return n, mean, M2, round(stddev, 3)

