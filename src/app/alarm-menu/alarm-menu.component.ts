import { Component, OnInit, OnDestroy } from '@angular/core';
import { NotificationsService, Alarm } from '../core/services/notifications.service';
import { Subscription } from 'rxjs';
import { INotificationConfig } from '../core/interfaces/app-settings.interfaces';
import { MatDivider } from '@angular/material/divider';
import { MatActionList, MatListItem } from '@angular/material/list';
import { MatTooltip } from '@angular/material/tooltip';
import { MatBadge } from '@angular/material/badge';
import { NgIf, NgFor, KeyValuePipe } from '@angular/common';
import { MatMenuTrigger, MatMenu, MatMenuItem } from '@angular/material/menu';
import { MatButton } from '@angular/material/button';



interface IMenuNode {
  [key: string]: any;
  label: string;
  childNode?: [IMenuItem | IMenuNode];
}
interface IMenuItem {
  [key: string]: any;
  label: string;
  Alarm?: Alarm;
}


@Component({
    selector: 'app-alarm-menu',
    templateUrl: './alarm-menu.component.html',
    styleUrls: ['./alarm-menu.component.scss'],
    standalone: true,
    imports: [MatButton, MatMenuTrigger, NgIf, MatBadge, MatMenu, NgFor, MatMenuItem, MatTooltip, MatActionList, MatDivider, MatListItem, KeyValuePipe]
})
export class AlarmMenuComponent implements OnInit, OnDestroy {

  private alarmSubscription: Subscription = null;
  private notificationServiceSettingsSubscription: Subscription = null;
  private alarmInfoSubscription: Subscription = null;

  alarms: { [path: string]: Alarm };
  notificationAlarms: { [path: string]: Alarm };
  alarmMenu: { [key: string]: string | IMenuItem | IMenuItem } = {}; // local menu array with string key

  // Menu properties
  alarmCount: number = 0;
  unAckAlarms: number = 0;
  blinkWarn: boolean = false;
  blinkCrit: boolean = false;

  isMuted: boolean = false;

  notificationConfig: INotificationConfig;

  constructor(
    private notificationsService: NotificationsService,
  ) {
    this.notificationServiceSettingsSubscription = this.notificationsService.getNotificationServiceConfigAsO().subscribe((config: INotificationConfig) => {
      this.notificationConfig = config;
    });
  }

  ngOnInit() {
    // init Alarm stream
    this.alarmSubscription = this.notificationsService.getAlarms().subscribe(
      message => {
        this.notificationAlarms = message;
        // Disabling notifications is done at the service level. No need to handle it here
        this.buildAlarmMenu();
      }
    );

    // init alarm info
    this.alarmInfoSubscription = this.notificationsService.getAlarmInfoAsO().subscribe(info => {
      this.unAckAlarms = info.unackCount;
      this.isMuted = info.isMuted;
      this.alarmCount = info.alarmCount;
      switch(info.visualSev) {
        case 0:
          this.blinkWarn = false;
          this.blinkCrit = false;
          break;
        case 1:
          this.blinkWarn = true;
          this.blinkCrit = false;
          break;
        case 2:
          this.blinkCrit = true;
          this.blinkWarn = false;
      }
    });
  }

  mutePlayer(state) {
    this.notificationsService.mutePlayer(state);
  }

  // we use this as a staging area to limit menu update events we build the menu from Alarms record
  buildAlarmMenu() {
    // clean notificationAlarms based on App Notification settings
    if (!this.notificationConfig.devices.showNormalState) {
      for (const [path, thealarm] of Object.entries(this.notificationAlarms)) {
        let alarm = this.notificationAlarms[path];

        if (alarm.notification['state'] == 'normal' && alarm['type'] == 'device') {
          delete this.notificationAlarms[path];
          break;
        }
      }
    }
    this.alarms = this.notificationAlarms;
  }

  createMenuRootItem(itemLabel: string): IMenuNode | null {
    let item: IMenuNode = {
      label: itemLabel
    }

    if(Object.entries(this.alarmMenu).length) {
      let i = Object.keys(this.alarmMenu).indexOf(itemLabel);
      if(i == -1) {
        console.log("Root: " + itemLabel + " not found. Search index: " + i);
        return item;
      } else {
        console.log("Root: " + itemLabel + " found. Search index: " + i);
        console.log(JSON.stringify(Object.values(this.alarmMenu)));
        return null;
      }
    }
    console.log(JSON.stringify(Object.values(this.alarmMenu)));
    return item;
  }

  createMenuChildItem(itemLabel: string, pathPositionIndex: number, pathArray: string[], alarm: Alarm): IMenuItem | IMenuNode {
    let item;

    const lastPosition = pathArray.length - 1;
    let parentLabel = pathArray[pathPositionIndex - 1];
    let indexParentNode = Object.keys(this.alarmMenu).indexOf(pathArray[parentLabel]);

    if (pathPositionIndex != lastPosition) {
      item = {
        label: pathArray[pathPositionIndex],
      }
    } else {
      item = {
        label: pathArray[pathPositionIndex],
        Alarm: alarm,
      }
    }

    for (const [label, menuNode] of Object.entries(this.alarmMenu)) {
        if (label == parentLabel) {
          console.log(JSON.stringify(menuNode));
          menuNode['childNode'] = item;

          if (pathPositionIndex != lastPosition) {
            pathPositionIndex++;
            if (pathPositionIndex != (lastPosition)) {
              item = {
                label: pathArray[pathPositionIndex]
              }
            } else {
              item = {
                label: pathArray[pathPositionIndex],
                Alarm: alarm,
              }
            }
            menuNode['childNode'][0].childNode = item;
          }
        }
      }

    return null;
  }


  ackAlarm(path: string, timeout: number = 0) {
    this.notificationsService.acknowledgeAlarm(path, timeout);
  }


  /**
   * Used by ngFor to tracks alarm items by key for menu optimization
   * @param alarm object in question
   */
  trackAlarmPath(index, alarm) {
    return alarm ? alarm.value.path : undefined;
  }

  ngOnDestroy() {
    this.notificationServiceSettingsSubscription?.unsubscribe();
    this.alarmSubscription?.unsubscribe();
    this.alarmInfoSubscription?.unsubscribe();
  }

}
