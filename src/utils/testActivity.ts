export interface TestActivity {
  noOfAxles: number;
  testTypeStartTimestamp: string;
  testTypeEndTimestamp: string;
  testStationType: string;
  testCode: string;
  vin: string;
  vrm: string;
  testStationPNumber: string;
  testResult: string;
  certificateNumber?: string;
  testTypeName: string;
  vehicleType: string;
  testerName: string;
  testerStaffId: string;
  testResultId: string;
}
