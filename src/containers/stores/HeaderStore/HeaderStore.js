import { action, computed, observable } from 'mobx';
import store from 'Store';
import axios from 'Axios';
import omit from 'object.omit';

const ORGANIZATION_TYPE = 'organization';
const PROJECT_TYPE = 'project';

function findDataIndex(collection, value) {
  return collection ? collection.findIndex(
    ({ id, organizationId }) => id === value.id && (
      (!organizationId && !value.organizationId) ||
      organizationId === value.organizationId
    ),
  ) : -1;
}

// 保留多少recent内容
function saveRecent(collection = [], value, number) {
  const index = findDataIndex(collection, value);
  if (index !== -1) {
    return collection.splice(index, 1).concat(collection.slice());
  } else {
    collection.unshift(value);
    return collection.slice(0, number);
  }
}

@store('HeaderStore')
class HeaderStore {
  @observable orgData = null;
  @observable proData = null;
  @observable selected = null;
  @observable recentItem = null;

  @computed
  get getSelected() {
    return this.selected;
  }

  @action
  setSelected(data) {
    this.selected = data;
  }

  @computed
  get getOrgData() {
    return this.orgData;
  }

  @action
  setOrgData(data) {
    this.orgData = data.filter(item => item.enabled === true);
  }

  @computed
  get getProData() {
    return this.proData;
  }

  fetchAxios(method, url) {
    return axios[method](url);
  }

  axiosGetOrgAndPro(userId) {
    return axios.all([this.fetchAxios('get', `/iam/v1/users/${userId}/organizations`),
      this.fetchAxios('get', `/iam/v1/users/${userId}/projects`)]).then((data) => {
      data[0].forEach((value) => {
        value.type = ORGANIZATION_TYPE;
      });
      data[1].forEach((value) => {
        value.type = PROJECT_TYPE;
      });
      this.setOrgData(data[0]);
      this.setProData(data[1]);
      return data;
    });
  }

  @action
  setProData(data) {
    this.proData = data.filter(item => item.enabled === true);
  }

  @action
  addProject(project) {
    project.type = PROJECT_TYPE;
    if (this.proData) {
      this.proData.unshift(project);
    } else {
      this.proData = [project];
    }
  }

  @action
  updateProject(project) {
    project.type = PROJECT_TYPE;
    if (this.proData) {
      const index = this.proData.findIndex(({ id }) => id === project.id);
      if (index !== -1) {
        this.proData.splice(index, 1, project);
      }
    }
    this.updateRecentItem(project);
  }

  @action
  addOrg(org) {
    org.type = ORGANIZATION_TYPE;
    if (this.orgData) {
      this.orgData.unshift(org);
    } else {
      this.orgData = [org];
    }
  }

  @action
  updateOrg(org) {
    org.type = ORGANIZATION_TYPE;
    if (this.orgData) {
      const index = this.orgData.findIndex(({ id }) => id === org.id);
      if (index !== -1) {
        this.orgData.splice(index, 1, org);
      }
    }
    this.updateRecentItem(org);
  }

  @computed
  get getRecentItem() {
    let recents = [];
    if (this.recentItem) {
      recents = this.recentItem;
    } else if (localStorage.recentItem) {
      recents = JSON.parse(localStorage.recentItem)
        .map(recent => omit(recent, 'children'));
    }
    return recents.filter(
      value => findDataIndex(this.orgData, value) !== -1 ||
        findDataIndex(this.proData, value) !== -1,
    );
  }

  @action
  updateRecentItem(recent) {
    if (recent) {
      const recentItem = JSON.parse(localStorage.recentItem);
      const index = recentItem.findIndex(({ id, organizationId }) =>
        id === recent.id && (!organizationId || organizationId === recent.organizationId));
      if (index !== -1) {
        recentItem.splice(index, 1, recent);
        localStorage.recentItem = JSON.stringify(recentItem);
        this.recentItem = recentItem;
      }
    }
  }

  @action
  setRecentItem(recent) {
    if (recent) {
      const recentItem = saveRecent(
        this.getRecentItem,
        omit(recent, 'children'), 10,
      );
      localStorage.recentItem = JSON.stringify(recentItem);
      this.recentItem = recentItem;
    }
  }
}

const headerStore = new HeaderStore();

export default headerStore;
