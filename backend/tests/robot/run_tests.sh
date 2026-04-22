#!/bin/bash
# Run all Robot Framework integration tests and generate HTML report

RESULTS_DIR="results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

echo "=========================================="
echo "  ROPA Platform - Integration Tests"
echo "  Started: $(date)"
echo "=========================================="

# Create results directory
mkdir -p $RESULTS_DIR

# Run all test suites
robot \
  --outputdir $RESULTS_DIR \
  --output output.xml \
  --report report.html \
  --log log.html \
  --loglevel INFO \
  --timestampoutputs \
  --reporttitle "ROPA Platform Integration Test Report" \
  --logtitle "ROPA Platform Test Execution Log" \
  .

EXIT_CODE=$?

echo ""
echo "=========================================="
echo "  Test Execution Complete"
echo "  Results saved to: $RESULTS_DIR/"
echo "  - report.html  (Summary Report)"
echo "  - log.html     (Detailed Log)"
echo "  - output.xml   (Raw Output)"
echo "=========================================="

if [ $EXIT_CODE -eq 0 ]; then
  echo "  STATUS: ALL TESTS PASSED ✓"
else
  echo "  STATUS: SOME TESTS FAILED ✗"
fi

exit $EXIT_CODE
