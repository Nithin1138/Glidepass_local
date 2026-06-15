import concurrent.futures
import time

def slow_task():
    time.sleep(3)
    return "slow"

def fast_task():
    time.sleep(0.5)
    return "fast"

def run_with():
    print("Start with...")
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        f1 = executor.submit(slow_task)
        f2 = executor.submit(fast_task)
        for future in concurrent.futures.as_completed([f1, f2]):
            if future.result() == "fast":
                return "fast_returned"

def run_without():
    print("Start without...")
    executor = concurrent.futures.ThreadPoolExecutor(max_workers=2)
    f1 = executor.submit(slow_task)
    f2 = executor.submit(fast_task)
    for future in concurrent.futures.as_completed([f1, f2]):
        if future.result() == "fast":
            executor.shutdown(wait=False)
            return "fast_returned"

start = time.time()
run_with()
print("With took:", time.time() - start)

start = time.time()
run_without()
print("Without took:", time.time() - start)
