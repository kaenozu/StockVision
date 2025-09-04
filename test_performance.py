#!/usr/bin/env python3
"""
Performance testing script for the optimized Stock API.

Tests response times for the main endpoints and compares against
the 100ms target.
"""
import requests
import time
import statistics
import json
from typing import Dict, List


def measure_response_time(url: str, runs: int = 5) -> Dict:
    """Measure response time for a URL over multiple runs."""
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
            
        # Small delay between requests
        time.sleep(0.1)
    
    if not times:
        return {
            'url': url,
            'avg_ms': float('inf'),
            'min_ms': float('inf'),
            'max_ms': float('inf'),
            'median_ms': float('inf'),
            'std_dev_ms': 0,
            'success_rate': 0,
            'errors': errors,
            'total_runs': runs
        }
    
    return {
        'url': url,
        'avg_ms': round(statistics.mean(times), 2),
        'min_ms': round(min(times), 2),
        'max_ms': round(max(times), 2),
        'median_ms': round(statistics.median(times), 2),
        'std_dev_ms': round(statistics.stdev(times) if len(times) > 1 else 0, 2),
        'success_rate': round((len(times) / runs) * 100, 1),
        'errors': errors,
        'total_runs': runs
    }


def main():
    """Run performance tests."""
    base_url = "http://localhost:8001"
    
    # Test endpoints
    endpoints = [
        "/health",
        "/stocks/7203",
        "/stocks/7203/current", 
        "/stocks/7203/history?days=30",
        "/stocks/9984",  # Test with different stock
        "/stocks/9984/current",
        "/stocks/9984/history?days=7"
    ]
    
    print("Performance Testing - Optimized Stock API")
    print("=" * 60)
    print(f"Target: < 100ms response time")
    print(f"Base URL: {base_url}")
    print(f"Test runs per endpoint: 5")
    print("=" * 60)
    
    results = []
    
    for endpoint in endpoints:
        url = f"{base_url}{endpoint}"
        print(f"Testing: {endpoint}")
        
        result = measure_response_time(url, runs=5)
        results.append(result)
        
        # Print result
        status = "PASS" if result['avg_ms'] < 100 else "FAIL"
        print(f"  {status} - Avg: {result['avg_ms']}ms, Min: {result['min_ms']}ms, Max: {result['max_ms']}ms")
        
        if result['errors'] > 0:
            print(f"  WARNING: {result['errors']} errors out of {result['total_runs']} requests")
        
        print()
    
    # Summary
    print("📊 PERFORMANCE SUMMARY")
    print("=" * 60)
    
    passing_tests = [r for r in results if r['avg_ms'] < 100 and r['success_rate'] == 100]
    failing_tests = [r for r in results if r['avg_ms'] >= 100 or r['success_rate'] < 100]
    
    print(f"Total endpoints tested: {len(results)}")
    print(f"Passing (< 100ms): {len(passing_tests)}")
    print(f"Failing (>= 100ms): {len(failing_tests)}")
    
    if passing_tests:
        avg_times = [r['avg_ms'] for r in passing_tests]
        print(f"Best performance: {min(avg_times):.2f}ms")
        print(f"Average of passing tests: {statistics.mean(avg_times):.2f}ms")
    
    if failing_tests:
        print(f"\n❌ FAILING TESTS:")
        for test in failing_tests:
            print(f"  {test['url']} - {test['avg_ms']}ms (Success: {test['success_rate']}%)")
    
    # Overall result
    print("\n🎯 OVERALL RESULT:")
    if len(passing_tests) == len(results):
        print("✅ ALL TESTS PASSED! API meets the < 100ms target.")
    else:
        print(f"❌ {len(failing_tests)}/{len(results)} tests failed to meet the 100ms target.")
    
    # Test a cache hit (second request should be faster)
    print(f"\n🔄 CACHE PERFORMANCE TEST:")
    print("Testing cache hit performance...")
    
    cache_test_url = f"{base_url}/stocks/7203"
    
    # First request (cache miss)
    first_result = measure_response_time(cache_test_url, runs=1)
    print(f"First request (cache miss): {first_result['avg_ms']}ms")
    
    # Second request (should be cache hit)
    time.sleep(0.1)
    second_result = measure_response_time(cache_test_url, runs=1) 
    print(f"Second request (cache hit): {second_result['avg_ms']}ms")
    
    if second_result['avg_ms'] < first_result['avg_ms']:
        print("✅ Cache is working - second request was faster!")
    else:
        print("⚠️  Cache performance unclear - similar response times")
    
    print("\n" + "=" * 60)
    print("Performance testing completed!")


if __name__ == "__main__":
    main()