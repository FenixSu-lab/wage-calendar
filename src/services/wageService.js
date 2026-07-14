/**
 * 获取工资单数据
 * @returns {Promise<{userName: string, records: Array<{date: string, amount: number}>}>}
 */
export const fetchWages = async (userName) => {

  // return new Promise((resolve) => {
  //   setTimeout(() => {
  //     resolve({
  //       userName: userName,
  //       records: [
  //         { date: "2025-10-01", wage: 300, shift: "morning" },
  //         { date: "2025-10-02", wage: 320, shift: "morning" },
  //         { date: "2025-10-05", wage: 300, shift: "morning" },
  //         { date: "2025-10-15", wage: 450, shift: "morning" },
  //         { date: "2025-11-01", wage: 300, shift: "morning" },
  //         { date: "2025-11-02", wage: 280, shift: "morning" },
  //         { date: "2025-11-03", wage: 300, shift: "morning" },
  //         { date: "2025-11-10", wage: 500, shift: "morning" },
  //         { date: "2025-11-20", wage: 300, shift: "morning" },
  //         { date: "2025-12-01", wage: 350, shift: "morning" },
  //         { date: "2025-12-05", wage: 350, shift: "morning" },
  //         { date: "2025-12-12", wage: 600, shift: "morning" },
  //         { date: "2025-12-13", wage: 600, shift: "morning" },
  //         { date: "2025-12-25", wage: 800, shift: "morning" },
  //       ]
  //     });
  //   }, 500);
  // });
  try {
    const response = await fetch(`http://115.236.44.18:7778/api/worker_salary/query_salarys?userName=${encodeURIComponent(userName)}`);
    // const response = await fetch(`http://192.168.1.14:7778/api/worker_salary/query_salarys?userName=${encodeURIComponent(userName)}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const result = await response.json();
    
    if (result.code === 200) {
      return result.data;
    } else {
      throw new Error(result.message || '获取数据失败');
    }
  } catch (error) {
    console.error("Failed to fetch wages:", error);
    // 在没有真实后端的情况下，为了演示不报错，这里可以暂时返回之前的 Mock 数据
    // 如果对接真实接口，请删除下方的 Mock 返回
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          userName: userName,
          records: [
            { date: "2023-10-01", wage: 300 },
            { date: "2023-10-02", wage: 320 },
            { date: "2023-10-05", wage: 300 },
            { date: "2023-10-15", wage: 450 },
            { date: "2023-11-01", wage: 300 },
            { date: "2023-11-02", wage: 280 },
            { date: "2023-11-03", wage: 300 },
            { date: "2023-11-10", wage: 500 },
            { date: "2023-11-20", wage: 300 },
            { date: "2023-12-01", wage: 350 },
            { date: "2023-12-05", wage: 350 },
            { date: "2023-12-12", wage: 600 },
            { date: "2023-12-13", wage: 600 },
            { date: "2023-12-25", wage: 800 },
          ]
        });
      }, 500);
    });
    // throw error; // 真实环境应抛出异常
  }
};
