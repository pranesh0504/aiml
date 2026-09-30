import os
import sys
import json
import urllib.request

print("==================================================")
print("RUNNING BUSINESS ENTITY RESOLUTION INTEGRATION TESTS")
print("==================================================")

# 1. Output Files Verification
print("\n[Test 1] Verifying Output TSV Files...")
base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
results_path = os.path.join(base_dir, "output", "matching_results.tsv")
candidates_path = os.path.join(base_dir, "output", "candidate_pairs.tsv")

assert os.path.exists(results_path), f"Missing {results_path}"
assert os.path.exists(candidates_path), f"Missing {candidates_path}"

with open(results_path, "r", encoding="utf-8") as f:
    h1 = f.readline().strip()
    assert h1 == "source1_entity_id\tmatched_entity_ids", f"Invalid results header: {h1}"
    res_rows = sum(1 for _ in f)
print(f"  [PASS] output/matching_results.tsv verified: {res_rows:,} records")

with open(candidates_path, "r", encoding="utf-8") as f:
    h2 = f.readline().strip()
    assert h2 == "source1_entity_id\tcandidate_entity_id\tcandidate_source\tname_similarity\taddress_similarity\tcombined_score", f"Invalid candidates header: {h2}"
    cand_rows = sum(1 for _ in f)
print(f"  [PASS] output/candidate_pairs.tsv verified: {cand_rows:,} pairs")

# 2. Testing API Endpoints
print("\n[Test 2] Testing Backend & Vite Proxy API Endpoints...")
API_BASE = "http://127.0.0.1:5173"

def get(path):
    url = f"{API_BASE}{path}"
    with urllib.request.urlopen(url) as resp:
        return json.loads(resp.read().decode("utf-8"))

def post(path, payload):
    url = f"{API_BASE}{path}"
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

# Test Health
health = get("/api/health")
assert health["status"] == "healthy"
print("  [PASS] /api/health: healthy")

# Test Auth
login = post("/api/auth/login", {"is_demo": True})
assert login["status"] == "success"
print("  [PASS] /api/auth/login: success")

# Test Dashboard
dash = get("/api/dashboard")
data = dash["data"]
assert data["source1_entities"] > 0
assert data["resolved_matches"] > 0
print(f"  [PASS] /api/dashboard: S1 Entities={data['source1_entities']:,}, Resolved Matches={data['resolved_matches']:,}")

# Test Demo Explore
demo = get("/api/demo/explore")
demo_eid = demo["data"]["entity_id"]
assert demo_eid.startswith("S1-")
print(f"  [PASS] /api/demo/explore: Target={demo_eid}")

# Test Entities (Pagination & Filtering)
entities = get("/api/entities?page=1&page_size=20")
assert len(entities["data"]["items"]) == 20
assert entities["data"]["total_records"] > 0
print(f"  [PASS] /api/entities (Page 1): {len(entities['data']['items'])} records returned, total={entities['data']['total_records']:,}")

# Test Entity Search
search_res = get("/api/entities?search=modern")
assert len(search_res["data"]["items"]) > 0
print(f"  [PASS] /api/entities (Search 'modern'): {len(search_res['data']['items'])} hits")

# Test Country Filtering
india_res = get("/api/entities?country=India&page_size=5")
assert all(item["country"] == "India" for item in india_res["data"]["items"])
print(f"  [PASS] /api/entities (Country 'India'): {len(india_res['data']['items'])} verified")

# Test Match Details
match_info = get(f"/api/matches/{demo_eid}")
assert match_info["data"]["source1"]["entity_id"] == demo_eid
assert "similarity_analysis" in match_info["data"]
print(f"  [PASS] /api/matches/{demo_eid}: Score={match_info['data']['similarity_analysis']['combined_score']}")

# Test Candidates
cands = get(f"/api/candidates/{demo_eid}")
assert cands["data"]["candidate_count"] > 0
print(f"  [PASS] /api/candidates/{demo_eid}: {cands['data']['candidate_count']} candidate pairs")

# Test Analytics
analytics = get("/api/analytics")
adata = analytics["data"]
assert adata["precision"] > 0.95
assert adata["f0_5"] > 0.90
print(f"  [PASS] /api/analytics: Precision={adata['precision']*100:.2f}%, F0.5={adata['f0_5']*100:.2f}%, Recall={adata['recall']*100:.2f}%")

# Test Dataset Stats
dstats = get("/api/dataset/stats")
fcounts = dstats["data"]["file_counts"]
assert fcounts["source1_count"] == 2206821
print(f"  [PASS] /api/dataset/stats: Verified file counts (S1: {fcounts['source1_count']:,}, S2: {fcounts['source2_count']:,}, S3: {fcounts['source3_count']:,})")

# Test Settings
cfg = get("/api/settings")
assert "name_weight" in cfg["data"]
print(f"  [PASS] /api/settings: Name Weight={cfg['data']['name_weight']}, Threshold={cfg['data']['threshold']}")

print("\n==================================================")
print("ALL VERIFICATION SUITES PASSED PERFECTLY!")
print("==================================================")
