import AWN from 'awesome-notifications';
import 'awesome-notifications/dist/style.css';

let instance = null;

function getNotifier() {
  if (!instance) {
    instance = new AWN({
      position: 'bottom-right',
      maxNotifications: 5,
      durations: {
        success: 3000,
        alert: 5000,
        info: 4000
      }
    });
  }
  return instance;
}

export function notifySuccess(message) {
  getNotifier().success(message);
}

export function notifyAlert(message) {
  getNotifier().alert(message);
}

export function notifyInfo(message) {
  getNotifier().info(message);
}

export function notifyProgress(promise, message = 'Loading') {
  return new Promise((resolve, reject) => {
    getNotifier().asyncBlock(
      promise,
      (result) => {
        if (result?.Workbook){
          notifySuccess('workbook created'); 
        }
       
        resolve(result);
      },
      (error) => {
        console.log('error', error);
        reject(error);
      },
      message
    );
  });
}
