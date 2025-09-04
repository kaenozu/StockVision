#!/usr/bin/env python3
"""
Simple performance testing script for the optimized Stock API.
"""
import requests
import time
import statistics


def test_endpoint(url: str, runs: int = 5):
    """Test an endpoint multiple times and return stats."""
    times = []
    errors = 0
    
    for i in range(runs):
        try:
            start = time.perf_counter()
            response = requests.get(url, timeout=10)
            end = time.perf_counter()
            
            if response.status_code == 200:
                response_time = (end - start) * 1000  # Convert to milliseconds
                times.append(response_time)
            else:
                errors += 1
                print(f"HTTP {response.status_code} for {url}")
                
        except Exception as e:
            errors += 1
            print(f"Error for {url}: {e}")
        
        time.sleep(0.1)  # Small delay between requests
    
    if times:
        avg_time = statistics.mean(times)
        min_time = min(times)
        max_time = max(times)
    else:
        avg_time = min_time = max_time = float('inf')
    
    return {
        'avg': avg_time,
        'min': min_time,
        'max': max_time,
        'errors': errors,
        'total': runs
    }


def main():
    base_url = "http://localhost:8001"
    
    print("Performance Testing - Optimized Stock API")
    print("=" * 50)
    print("Target: < 100ms response time")
    print(f"Testing {base_url}")
    print("=" * 50)
    
    endpoints = [
        "/health",
        "/stocks/7203",
        "/stocks/7203/current",
        "/stocks/7203/history?days=30"
    ]
    
    results = []
    
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        print(f"Testing: {endpoint}")
        
        result = test_endpoint(url)
        results.append((endpoint, result))
        
        status = "PASS" if result['avg'] < 100 else "FAIL"
        print(f"  {status} - Avg: {result['avg']:.2f}ms")
        print(f"         Range: {result['min']:.2f}ms - {result['max']:.2f}ms")
        
        if result['errors'] > 0:
            print(f"  WARNING: {result['errors']} errors")
        print()
    
    # Summary
    print("SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, r in results if r['avg'] < 100 and r['errors'] == 0)
    total = len(results)
    
    print(f"Passed: {passed}/{total} endpoints")
    
    if passed == total:
        print("SUCCESS: All endpoints meet the < 100ms target!")
    else:
        print("Some endpoints failed to meet the target.")
    
    # Best and worst performance
    valid_results = [(e, r) for e, r in results if r['avg'] != float('inf')]
    if valid_results:
        best = min(valid_results, key=lambda x: x[1]['avg'])
        worst = max(valid_results, key=lambda x: x[1]['avg'])
        
        print(f"Best:  {best[0]} - {best[1]['avg']:.2f}ms")
        print(f"Worst: {worst[0]} - {worst[1]['avg']:.2f}ms")


if __name__ == "__main__":
    main()